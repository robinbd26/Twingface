import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import {
  AddProfessionalIdentitySchema,
  MAX_PROFESSIONAL_IDENTITIES,
} from '@/lib/mediaworld/validations';

export const runtime = 'nodejs';

const identitySelect = {
  id: true,
  industry: { select: { id: true, code: true, nameEn: true, nameBn: true } },
  mainCategory: { select: { id: true, code: true, nameEn: true, nameBn: true, industryId: true } },
  designation: { select: { id: true, code: true, nameEn: true, nameBn: true } },
} as const;

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 });

    const identities = await prisma.userProfessionalIdentity.findMany({
      where: { userId: user.id },
      orderBy: [{ industry: { sortOrder: 'asc' } }, { mainCategory: { sortOrder: 'asc' } }, { createdAt: 'asc' }],
      select: identitySelect,
    });
    return NextResponse.json({ identities });
  } catch (error) {
    console.error('[mediaworld/identities GET] error:', error);
    return NextResponse.json({ error: 'Unable to load professional identities.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 });

    const body = await request.json().catch(() => null);
    const parsed = AddProfessionalIdentitySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Please correct the highlighted fields.', fields: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const account = await prisma.user.findUnique({
      where: { id: user.id },
      select: { accountType: true, professionalIdentities: { select: { id: true } } },
    });
    if (!account) return NextResponse.json({ error: 'Account not found.' }, { status: 404 });
    if (account.accountType !== 'PROFESSIONAL') {
      return NextResponse.json({ error: 'Professional identities require a Media Professional account.' }, { status: 403 });
    }
    if (account.professionalIdentities.length >= MAX_PROFESSIONAL_IDENTITIES) {
      return NextResponse.json(
        { error: `A profile can have at most ${MAX_PROFESSIONAL_IDENTITIES} professional identities.` },
        { status: 400 },
      );
    }

    const { industryId, mainCategoryId, designationId } = parsed.data;
    const [industry, category, designation] = await Promise.all([
      prisma.industry.findFirst({ where: { id: industryId, isActive: true }, select: { id: true } }),
      prisma.mainCategory.findFirst({ where: { id: mainCategoryId, isActive: true }, select: { id: true, industryId: true } }),
      prisma.designation.findFirst({ where: { id: designationId, isActive: true }, select: { id: true } }),
    ]);
    if (!industry || !category || !designation) {
      return NextResponse.json({ error: 'The selected profession is no longer available.' }, { status: 400 });
    }
    if (category.industryId !== industry.id) {
      return NextResponse.json({ error: 'The selected category does not belong to that industry.' }, { status: 400 });
    }

    const link = await prisma.designationCategory.findUnique({
      where: { designationId_categoryId: { designationId, categoryId: category.id } },
      select: { designationId: true },
    });
    if (!link) {
      return NextResponse.json({ error: 'That designation is not offered under the selected category.' }, { status: 400 });
    }

    try {
      const identity = await prisma.userProfessionalIdentity.create({
        data: { userId: user.id, industryId: industry.id, mainCategoryId: category.id, designationId: designation.id },
        select: identitySelect,
      });
      return NextResponse.json({ identity }, { status: 201 });
    } catch {
      return NextResponse.json({ error: 'That professional identity is already on your profile.' }, { status: 409 });
    }
  } catch (error) {
    console.error('[mediaworld/identities POST] error:', error);
    return NextResponse.json({ error: 'Unable to add professional identity.' }, { status: 500 });
  }
}
