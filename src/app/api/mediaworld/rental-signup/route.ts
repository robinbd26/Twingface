import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { createSession, hashPassword, setSessionCookie } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { rentalSignupSchema } from '@/lib/validations';
import { createSuggestedUserId } from '@/lib/user-id';
import { uploadMediaWorldLogo } from '@/lib/cloudinary';
import { MAX_MEDIAWORLD_LOGO_BYTES, MEDIAWORLD_LOGO_MIME_TYPES, isValidLogoFile } from '@/lib/mediaworld/uploads';
import { SIGNUP_IP_RULE, clientIp, consumeRateLimit, rateLimitedResponse, signupIpKey } from '@/lib/rate-limit';

export const runtime = 'nodejs';

const DUPLICATE_USERNAME = 'Unable to create a unique User ID. Please try again.';
const SIGNUP_FAILED = 'Unable to create your For Rent account. Please try again.';
const LOGO_FAILED = 'Account created, but the logo upload failed. You can add the logo again later.';

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

function readFormFields(formData: FormData): Record<string, unknown> {
  return {
    name: formData.get('name'),
    email: formData.get('email'),
    phone: formData.get('phone'),
    password: formData.get('password'),
    confirmPassword: formData.get('confirmPassword'),
    division: formData.get('division'),
    district: formData.get('district'),
    presentAddress: formData.get('presentAddress'),
    ownerName: formData.get('ownerName'),
    businessName: formData.get('businessName') ?? '',
    location: formData.get('location'),
    fullAddress: formData.get('fullAddress') ?? '',
    description: formData.get('description'),
  };
}

export async function POST(request: Request) {
  const limitDecision = await consumeRateLimit(signupIpKey('rental', clientIp(request)), SIGNUP_IP_RULE);
  if (!limitDecision.allowed) return rateLimitedResponse(limitDecision);

  const contentType = request.headers.get('content-type') ?? '';
  const formData = contentType.startsWith('multipart/form-data') ? await request.formData().catch(() => null) : null;
  const rawFields = formData ? readFormFields(formData) : await request.json().catch(() => null);

  const parsed = rentalSignupSchema.safeParse(rawFields);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Please correct the highlighted fields.', fields: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { name, email, phone, password, division, district, presentAddress, ownerName, businessName, location, fullAddress, description } = parsed.data;

  const emailTaken = email ? await prisma.user.findUnique({ where: { email }, select: { id: true } }) : null;
  if (emailTaken) {
    const message = 'That email is already in use.';
    return NextResponse.json({ error: message, fields: { email: [message] } }, { status: 409 });
  }
  const phoneTaken = phone ? await prisma.user.findUnique({ where: { phone }, select: { id: true } }) : null;
  if (phoneTaken) {
    const message = 'That mobile number is already in use.';
    return NextResponse.json({ error: message, fields: { phone: [message] } }, { status: 409 });
  }

  let logoBytes: Buffer | null = null;
  let logoMimeType = '';
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
    logoBytes = bytes;
    logoMimeType = logoFile.type;
  }

  const passwordHash = await hashPassword(password);
  let username = createSuggestedUserId(name);
  const providerData = {
    ownerName,
    businessName: businessName ?? null,
    phone,
    email: email ?? null,
    location,
    fullAddress: fullAddress ?? null,
    description,
  };

  for (let attempt = 0; attempt < 5; attempt += 1) {
    if (await prisma.user.findUnique({ where: { username }, select: { id: true } })) {
      username = createSuggestedUserId(name);
      continue;
    }

    try {
      const created = await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            name,
            username,
            email,
            phone,
            passwordHash,
            division,
            district,
            presentAddress,
            accountType: 'RENTAL',
          },
          select: {
            id: true,
            name: true,
            username: true,
            email: true,
            phone: true,
            division: true,
            district: true,
            presentAddress: true,
            accountType: true,
          },
        });
        const provider = await tx.rentalProvider.create({
          data: { userId: user.id, ...providerData },
          select: providerSelect,
        });
        return { user, provider };
      });

      let logoSaved = !logoBytes;
      if (logoBytes) {
        try {
          const uploaded = await uploadMediaWorldLogo({
            bytes: logoBytes,
            mimeType: logoMimeType,
            userId: created.user.id,
            kind: 'provider',
          });
          created.provider = await prisma.rentalProvider.update({
            where: { userId: created.user.id },
            data: { logoUrl: uploaded.imageUrl, logoPublicId: uploaded.imagePublicId },
            select: providerSelect,
          });
          logoSaved = true;
        } catch (error) {
          console.error('[mediaworld/rental-signup POST] logo upload failed:', error);
        }
      }

      const session = await createSession(created.user.id);
      await setSessionCookie(session.token, session.expiresAt);
      return NextResponse.json(
        {
          user: created.user,
          provider: created.provider,
          ...(logoSaved ? {} : { warning: LOGO_FAILED }),
        },
        { status: 201 },
      );
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const raw = Array.isArray(error.meta?.target) ? error.meta.target.join(',') : String(error.meta?.target ?? '');
        if (raw.includes('username') && attempt < 4) {
          username = createSuggestedUserId(name);
          continue;
        }
        const field = raw.includes('email') ? 'email' : raw.includes('phone') ? 'phone' : 'username';
        const message = field === 'email'
          ? 'That email is already in use.'
          : field === 'phone'
            ? 'That mobile number is already in use.'
            : DUPLICATE_USERNAME;
        return NextResponse.json({ error: message, fields: { [field]: [message] } }, { status: 409 });
      }
      console.error('[mediaworld/rental-signup POST] error:', error);
      return NextResponse.json({ error: SIGNUP_FAILED }, { status: 500 });
    }
  }

  return NextResponse.json({ error: DUPLICATE_USERNAME, fields: { username: [DUPLICATE_USERNAME] } }, { status: 409 });
}
