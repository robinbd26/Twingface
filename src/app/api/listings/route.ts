import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { parseListingsLimit, safeListingSelect } from '@/lib/listing';
import { CreateListingSchema } from '@/lib/validations';

function decodeCursor(value: string | null): string | null {
  if (!value) return null;
  try {
    const parsed: unknown = JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
    return typeof parsed === 'object' && parsed !== null && 'id' in parsed && typeof parsed.id === 'string' ? parsed.id : null;
  } catch {
    return null;
  }
}

function encodeCursor(id: string): string {
  return Buffer.from(JSON.stringify({ id })).toString('base64url');
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const scope = searchParams.get('scope') === 'mine' ? 'mine' : 'all';
  const user = await getCurrentUser();
  if (scope === 'mine' && !user) return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 });

  const limit = parseListingsLimit(searchParams.get('limit'));
  const cursorId = decodeCursor(searchParams.get('cursor'));
  const query = searchParams.get('query')?.trim() ?? '';
  const category = searchParams.get('category')?.trim() ?? '';

  const where = {
    ...(scope === 'mine' ? { sellerId: user!.id } : { status: 'AVAILABLE' as const }),
    ...(query ? { title: { contains: query, mode: 'insensitive' as const } } : {}),
    ...(category ? { category } : {}),
  };
  const listings = await prisma.listing.findMany({
    where,
    select: safeListingSelect,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: limit + 1,
    ...(cursorId ? { cursor: { id: cursorId }, skip: 1 } : {}),
  });
  const hasNextPage = listings.length > limit;
  const items = hasNextPage ? listings.slice(0, limit) : listings;
  return NextResponse.json({ listings: items, nextCursor: hasNextPage ? encodeCursor(items.at(-1)!.id) : null });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 });
  const input = CreateListingSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: 'Please correct the highlighted fields.', fields: input.error.flatten().fieldErrors }, { status: 400 });

  const listing = await prisma.listing.create({
    data: { ...input.data, sellerId: user.id },
    select: safeListingSelect,
  });
  return NextResponse.json({ listing }, { status: 201 });
}
