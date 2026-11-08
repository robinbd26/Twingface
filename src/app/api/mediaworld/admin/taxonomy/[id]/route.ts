import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import {
  adminFailure,
  deleteTaxonomyNode,
  hasTaxonomyUpdate,
  isAdminId,
  TaxonomyEntitySchema,
  TaxonomyUpdateSchema,
  updateTaxonomyNode,
} from '@/lib/mediaworld/admin';

export const runtime = 'nodejs';

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 });
    if (user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Super Admin access required.' }, { status: 403 });
    }

    const { id } = await params;
    if (!isAdminId(id)) return adminFailure(404, 'Taxonomy node not found.');

    const body = await request.json().catch(() => null);
    const parsed = TaxonomyUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Please correct the highlighted fields.', fields: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }
    if (!hasTaxonomyUpdate(parsed.data)) {
      return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 });
    }

    const result = await updateTaxonomyNode({ ...parsed.data, id });
    if (!result.ok) return adminFailure(result.status, result.error, result.fields);
    return NextResponse.json({ node: result.data });
  } catch (error) {
    console.error('[mediaworld/admin/taxonomy/[id] PATCH] error:', error);
    return NextResponse.json({ error: 'Unable to update taxonomy node.' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: Params) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 });
    if (user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Super Admin access required.' }, { status: 403 });
    }

    const { id } = await params;
    if (!isAdminId(id)) return adminFailure(404, 'Taxonomy node not found.');

    const entity = TaxonomyEntitySchema.safeParse(new URL(request.url).searchParams.get('entity'));
    if (!entity.success) {
      return NextResponse.json(
        { error: 'Please correct the highlighted fields.', fields: { entity: ['Choose which taxonomy node type to delete.'] } },
        { status: 400 },
      );
    }

    const result = await deleteTaxonomyNode(entity.data, id);
    if (!result.ok) return adminFailure(result.status, result.error, result.fields);
    return NextResponse.json({ deleted: true, id: result.data.id });
  } catch (error) {
    console.error('[mediaworld/admin/taxonomy/[id] DELETE] error:', error);
    return NextResponse.json({ error: 'Unable to delete taxonomy node.' }, { status: 500 });
  }
}
