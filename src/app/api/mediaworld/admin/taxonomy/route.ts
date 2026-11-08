import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import {
  adminFailure,
  createTaxonomyNode,
  getAdminTaxonomy,
  TaxonomyCreateSchema,
} from '@/lib/mediaworld/admin';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 });
    if (user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Super Admin access required.' }, { status: 403 });
    }

    const nodes = await getAdminTaxonomy();
    return NextResponse.json({ nodes });
  } catch (error) {
    console.error('[mediaworld/admin/taxonomy GET] error:', error);
    return NextResponse.json({ error: 'Unable to load taxonomy.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 });
    if (user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Super Admin access required.' }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    const parsed = TaxonomyCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Please correct the highlighted fields.', fields: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const result = await createTaxonomyNode(parsed.data);
    if (!result.ok) return adminFailure(result.status, result.error, result.fields);
    return NextResponse.json({ node: result.data }, { status: 201 });
  } catch (error) {
    console.error('[mediaworld/admin/taxonomy POST] error:', error);
    return NextResponse.json({ error: 'Unable to create taxonomy node.' }, { status: 500 });
  }
}
