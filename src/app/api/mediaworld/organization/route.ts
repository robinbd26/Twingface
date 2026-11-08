import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { uploadMediaWorldLogo } from '@/lib/cloudinary';
import { prisma } from '@/lib/db';
import { MAX_MEDIAWORLD_LOGO_BYTES, MEDIAWORLD_LOGO_MIME_TYPES, isValidLogoFile } from '@/lib/mediaworld/uploads';
import { OrganizationProfileSchema } from '@/lib/mediaworld/validations';

export const runtime = 'nodejs';

const organizationSelect = {
  id: true,
  orgName: true,
  contactName: true,
  phone: true,
  email: true,
  address: true,
  city: true,
  description: true,
  website: true,
  logoUrl: true,
  orgType: { select: { id: true, code: true, nameEn: true, nameBn: true } },
} as const;

function readFormFields(formData: FormData): Record<string, unknown> {
  return {
    orgTypeId: formData.get('orgTypeId'),
    orgName: formData.get('orgName'),
    contactName: formData.get('contactName'),
    phone: formData.get('phone') ?? '',
    email: formData.get('email') ?? '',
    address: formData.get('address') ?? '',
    city: formData.get('city') ?? '',
    description: formData.get('description') ?? '',
    website: formData.get('website') ?? '',
  };
}

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 });

    const organization = await prisma.organization.findUnique({
      where: { userId: user.id },
      select: organizationSelect,
    });
    return NextResponse.json({ organization });
  } catch (error) {
    console.error('[mediaworld/organization GET] error:', error);
    return NextResponse.json({ error: 'Unable to load organization profile.' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 });

    const account = await prisma.user.findUnique({
      where: { id: user.id },
      select: { accountType: true },
    });
    if (account?.accountType !== 'BUSINESS') {
      return NextResponse.json({ error: 'Organization profiles require a Business account.' }, { status: 403 });
    }

    const contentType = request.headers.get('content-type') ?? '';
    const formData = contentType.startsWith('multipart/form-data') ? await request.formData().catch(() => null) : null;

    let rawFields: Record<string, unknown>;
    if (formData) {
      rawFields = readFormFields(formData);
    } else {
      const body = await request.json().catch(() => null);
      if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
      rawFields = body as Record<string, unknown>;
    }

    const parsed = OrganizationProfileSchema.safeParse(rawFields);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Please correct the highlighted fields.', fields: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const orgType = await prisma.organizationType.findFirst({
      where: { id: parsed.data.orgTypeId, isActive: true },
      select: { id: true },
    });
    if (!orgType) {
      return NextResponse.json(
        { error: 'Please correct the highlighted fields.', fields: { orgTypeId: ['Choose a valid organization type.'] } },
        { status: 400 },
      );
    }

    type OrganizationData = {
  orgTypeId: string;
  orgName: string;
  contactName: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  description: string | null;
  website: string | null;
  logoUrl?: string;
  logoPublicId?: string;
};

const data: OrganizationData = {
      orgTypeId: orgType.id,
      orgName: parsed.data.orgName,
      contactName: parsed.data.contactName,
      phone: parsed.data.phone ?? null,
      email: parsed.data.email ?? null,
      address: parsed.data.address ?? null,
      city: parsed.data.city ?? null,
      description: parsed.data.description ?? null,
      website: parsed.data.website ?? null,
    };

    const logoFile = formData?.get('logo');
    if (logoFile instanceof File && logoFile.size > 0) {
      if (!MEDIAWORLD_LOGO_MIME_TYPES.includes(logoFile.type as (typeof MEDIAWORLD_LOGO_MIME_TYPES)[number])
        || logoFile.size > MAX_MEDIAWORLD_LOGO_BYTES) {
        return NextResponse.json(
          { error: 'Please correct the highlighted fields.', fields: { logo: ['Use a JPEG, PNG, WebP or GIF logo under 5MB.'] } },
          { status: 400 },
        );
      }
      const bytes = Buffer.from(await logoFile.arrayBuffer());
      if (!isValidLogoFile(logoFile.type, bytes)) {
        return NextResponse.json(
          { error: 'Please correct the highlighted fields.', fields: { logo: ['That image file could not be read.'] } },
          { status: 400 },
        );
      }
      const uploaded = await uploadMediaWorldLogo({ bytes, mimeType: logoFile.type, userId: user.id, kind: 'organization' });
      data.logoUrl = uploaded.imageUrl;
      data.logoPublicId = uploaded.imagePublicId;
    }

    const organization = await prisma.organization.upsert({
      where: { userId: user.id },
      create: { userId: user.id, ...data },
      update: data,
      select: organizationSelect,
    });
    return NextResponse.json({ organization });
  } catch (error) {
    console.error('[mediaworld/organization PUT] error:', error);
    return NextResponse.json({ error: 'Unable to save organization profile.' }, { status: 500 });
  }
}
