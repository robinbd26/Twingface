import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { uploadMediaWorldLogo } from '@/lib/cloudinary';
import { prisma } from '@/lib/db';
import { MAX_MEDIAWORLD_LOGO_BYTES, MEDIAWORLD_LOGO_MIME_TYPES, isValidLogoFile } from '@/lib/mediaworld/uploads';
import { RentalProviderProfileSchema } from '@/lib/mediaworld/validations';

export const runtime = 'nodejs';

const providerSelect = {
  id: true,
  ownerName: true,
  businessName: true,
  phone: true,
  email: true,
  location: true,
  fullAddress: true,
  description: true,
  logoUrl: true,
} as const;

type ProviderData = {
  ownerName: string;
  businessName: string | null;
  phone: string;
  email: string | null;
  location: string;
  fullAddress: string | null;
  description: string;
  logoUrl?: string;
  logoPublicId?: string;
};

function readFormFields(formData: FormData): Record<string, unknown> {
  return {
    ownerName: formData.get('ownerName'),
    businessName: formData.get('businessName') ?? '',
    phone: formData.get('phone'),
    email: formData.get('email') ?? '',
    location: formData.get('location'),
    fullAddress: formData.get('fullAddress') ?? '',
    description: formData.get('description'),
  };
}

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 });

    const provider = await prisma.rentalProvider.findUnique({
      where: { userId: user.id },
      select: providerSelect,
    });
    return NextResponse.json({ provider });
  } catch (error) {
    console.error('[mediaworld/rental-provider GET] error:', error);
    return NextResponse.json({ error: 'Unable to load rental provider profile.' }, { status: 500 });
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
    if (account?.accountType !== 'RENTAL') {
      return NextResponse.json({ error: 'Rental profiles require a For Rent account.' }, { status: 403 });
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

    const parsed = RentalProviderProfileSchema.safeParse(rawFields);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Please correct the highlighted fields.', fields: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const data: ProviderData = {
      ownerName: parsed.data.ownerName,
      businessName: parsed.data.businessName ?? null,
      phone: parsed.data.phone,
      email: parsed.data.email ?? null,
      location: parsed.data.location,
      fullAddress: parsed.data.fullAddress ?? null,
      description: parsed.data.description,
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
      const uploaded = await uploadMediaWorldLogo({ bytes, mimeType: logoFile.type, userId: user.id, kind: 'provider' });
      data.logoUrl = uploaded.imageUrl;
      data.logoPublicId = uploaded.imagePublicId;
    }

    const provider = await prisma.rentalProvider.upsert({
      where: { userId: user.id },
      create: { userId: user.id, ...data },
      update: data,
      select: providerSelect,
    });
    return NextResponse.json({ provider });
  } catch (error) {
    console.error('[mediaworld/rental-provider PUT] error:', error);
    return NextResponse.json({ error: 'Unable to save rental provider profile.' }, { status: 500 });
  }
}
