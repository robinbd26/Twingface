import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import {
  adminFailure,
  adminReportSelect,
  canMoveReportStatus,
  isAdminId,
  REPORT_STATUS_TRANSITIONS,
  UpdateReportStatusSchema,
} from '@/lib/mediaworld/admin';

export const runtime = 'nodejs';

type Params = { params: Promise<{ id: string }> };

const STATUS_LABELS: Record<string, string> = {
  OPEN: 'Open',
  IN_REVIEW: 'In review',
  RESOLVED: 'Resolved',
  DISMISSED: 'Dismissed',
};

export async function PATCH(request: Request, { params }: Params) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 });
    if (user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Super Admin access required.' }, { status: 403 });
    }

    const { id } = await params;
    if (!isAdminId(id)) return adminFailure(404, 'Report not found.');

    const body = await request.json().catch(() => null);
    const parsed = UpdateReportStatusSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Please correct the highlighted fields.', fields: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const existing = await prisma.rentalListingReport.findUnique({ where: { id }, select: { id: true, status: true } });
    if (!existing) return adminFailure(404, 'Report not found.');

    if (!canMoveReportStatus(existing.status, parsed.data.status)) {
      const allowed = REPORT_STATUS_TRANSITIONS[existing.status].map((status) => STATUS_LABELS[status]);
      return adminFailure(
        409,
        existing.status === parsed.data.status
          ? `Report is already ${STATUS_LABELS[existing.status]}.`
          : `A ${STATUS_LABELS[existing.status]} report cannot move to ${STATUS_LABELS[parsed.data.status]}. Allowed next steps: ${allowed.length ? allowed.join(', ') : 'none — resolved and dismissed reports are final.'}`,
      );
    }

    const report = await prisma.rentalListingReport.update({ where: { id }, data: { status: parsed.data.status }, select: adminReportSelect });
    return NextResponse.json({ report });
  } catch (error) {
    console.error('[mediaworld/admin/reports/[id] PATCH] error:', error);
    return NextResponse.json({ error: 'Unable to update the report status.' }, { status: 500 });
  }
}
