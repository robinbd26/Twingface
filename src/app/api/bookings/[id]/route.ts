import type { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { describeConflict } from '@/lib/bookings/availability';
import { BookingActionSchema, bookingListSelect, serializeBooking } from '@/lib/bookings/booking';
import {
  bookingStatusLabel,
  checkBookingAction,
  type BookingAction,
  type BookingActorRole,
  type BookingStatusValue,
} from '@/lib/bookings/lifecycle';
import { findListingConflict } from '@/lib/bookings/queries';

export const runtime = 'nodejs';

type Context = { params: Promise<{ id: string }> };

const ID_PATTERN = /^[a-z0-9]{1,40}$/i;
const HISTORY_MAX = 500;

const SUCCESS_MESSAGES: Record<BookingAction, string> = {
  approve: 'Booking confirmed after the availability check.',
  reject: 'Booking request rejected.',
  cancel: 'Booking cancelled.',
  complete: 'Booking marked complete.',
};

const HISTORY_NOTES: Record<BookingAction, string> = {
  approve: 'Approved after availability check',
  reject: 'Request rejected by the provider',
  cancel: 'Cancelled',
  complete: 'Rental completed',
};

function readAction(source: Record<string, unknown>) {
  const action = typeof source.action === 'string' ? source.action.trim().toLowerCase() : '';
  const note = typeof source.note === 'string' ? source.note.trim() : '';
  return BookingActionSchema.safeParse({ action, note: note || undefined });
}

function historyNote(note: string | undefined, action: BookingAction) {
  return (note ?? HISTORY_NOTES[action]).slice(0, HISTORY_MAX);
}

function statusConflict(status: BookingStatusValue) {
  return NextResponse.json(
    { error: `This booking is now ${bookingStatusLabel(status).toLowerCase()}. Refresh and try again.` },
    { status: 409 },
  );
}

export async function PATCH(request: Request, { params }: Context) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 });

    const { id } = await params;
    if (!ID_PATTERN.test(id)) return NextResponse.json({ error: 'Booking not found.' }, { status: 404 });

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
    }
    const parsed = readAction(body as Record<string, unknown>);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Choose a valid action.', fields: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const booking = await prisma.booking.findUnique({
      where: { id },
      select: {
        id: true,
        listingId: true,
        renterId: true,
        status: true,
        listing: {
          select: {
            isActive: true,
            availability: true,
            provider: { select: { userId: true } },
          },
        },
      },
    });
    if (!booking) return NextResponse.json({ error: 'Booking not found.' }, { status: 404 });

    const isProvider = booking.listing.provider.userId === user.id;
    const isRenter = booking.renterId === user.id;
    if (!isProvider && !isRenter) {
      return NextResponse.json({ error: 'You cannot change this booking.' }, { status: 403 });
    }
    const role: BookingActorRole = isProvider ? 'provider' : 'renter';

    const action = parsed.data.action;
    const check = checkBookingAction(action, booking.status, role);
    if (!check.ok) {
      return NextResponse.json(
        {
          error: check.reason === 'forbidden'
            ? 'Only the listing owner can approve, reject or complete a booking.'
            : `This booking is ${bookingStatusLabel(booking.status).toLowerCase()}; that action is not available.`,
        },
        { status: check.reason === 'forbidden' ? 403 : 409 },
      );
    }

    const now = new Date();
    const note = parsed.data.note;

    if (action === 'approve') {
      /* Re-check inside the transaction: a stale PENDING read must never confirm a slot
         another approval already took. The listing row lock serialises approvals. */
      const outcome = await prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT "id" FROM "rental_listings" WHERE "id" = ${booking.listingId} FOR UPDATE`;

        const fresh = await tx.booking.findUnique({
          where: { id: booking.id },
          select: {
            status: true,
            startAt: true,
            endAt: true,
            listingId: true,
            listing: { select: { isActive: true, availability: true } },
          },
        });
        if (!fresh) return { kind: 'missing' as const };
        if (fresh.status !== 'PENDING') return { kind: 'changed' as const, status: fresh.status };
        if (!fresh.listing.isActive || fresh.listing.availability !== 'AVAILABLE') {
          return { kind: 'unavailable' as const };
        }

        const conflict = await findListingConflict(tx, {
          listingId: fresh.listingId,
          startAt: fresh.startAt,
          endAt: fresh.endAt,
          excludeBookingId: booking.id,
        });
        if (conflict) return { kind: 'conflict' as const, conflict };

        const updated = await tx.booking.update({
          where: { id: booking.id },
          data: {
            status: 'CONFIRMED',
            decidedAt: now,
            decisionNote: note ?? null,
            history: {
              create: {
                fromStatus: 'PENDING',
                toStatus: 'CONFIRMED',
                actorId: user.id,
                note: historyNote(note, action),
              },
            },
          },
          select: bookingListSelect,
        });
        return { kind: 'ok' as const, booking: updated };
      });

      if (outcome.kind === 'missing') {
        return NextResponse.json({ error: 'Booking not found.' }, { status: 404 });
      }
      if (outcome.kind === 'changed') return statusConflict(outcome.status);
      if (outcome.kind === 'unavailable') {
        return NextResponse.json(
          { error: 'This listing is not accepting bookings right now.' },
          { status: 409 },
        );
      }
      if (outcome.kind === 'conflict') {
        return NextResponse.json(
          {
            error: describeConflict({
              kind: outcome.conflict.kind,
              startAt: outcome.conflict.startAt.toISOString(),
              endAt: outcome.conflict.endAt.toISOString(),
            }),
            conflict: {
              kind: outcome.conflict.kind,
              startAt: outcome.conflict.startAt.toISOString(),
              endAt: outcome.conflict.endAt.toISOString(),
            },
          },
          { status: 409 },
        );
      }

      return NextResponse.json({ booking: serializeBooking(outcome.booking), message: SUCCESS_MESSAGES[action] });
    }

    const data: Prisma.BookingUpdateInput = {
      status: check.to,
      history: {
        create: {
          fromStatus: booking.status,
          toStatus: check.to,
          actorId: user.id,
          note: historyNote(note, action),
        },
      },
    };
    if (action === 'reject') data.decidedAt = now;
    if (action === 'complete') data.completedAt = now;
    if (note) data.decisionNote = note;

    const outcome = await prisma.$transaction(async (tx) => {
      const fresh = await tx.booking.findUnique({ where: { id: booking.id }, select: { status: true } });
      if (!fresh) return { kind: 'missing' as const };
      if (fresh.status !== booking.status) return { kind: 'changed' as const, status: fresh.status };

      const updated = await tx.booking.update({
        where: { id: booking.id },
        data,
        select: bookingListSelect,
      });
      return { kind: 'ok' as const, booking: updated };
    });

    if (outcome.kind === 'missing') return NextResponse.json({ error: 'Booking not found.' }, { status: 404 });
    if (outcome.kind === 'changed') return statusConflict(outcome.status);

    return NextResponse.json({ booking: serializeBooking(outcome.booking), message: SUCCESS_MESSAGES[action] });
  } catch (error) {
    console.error('[bookings PATCH] error:', error);
    return NextResponse.json({ error: 'Unable to update the booking.' }, { status: 500 });
  }
}
