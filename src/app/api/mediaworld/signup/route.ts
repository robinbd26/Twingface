import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { createSession, hashPassword, setSessionCookie } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { mediaWorldSignupSchema } from '@/lib/validations';
import { createSuggestedUserId } from '@/lib/user-id';
import { SIGNUP_IP_RULE, clientIp, consumeRateLimit, rateLimitedResponse, signupIpKey } from '@/lib/rate-limit';

export const runtime = 'nodejs';

const DUPLICATE_USERNAME = 'Unable to create a unique User ID. Please try again.';

export async function POST(request: Request) {
  const limitDecision = await consumeRateLimit(signupIpKey('mediaworld', clientIp(request)), SIGNUP_IP_RULE);
  if (!limitDecision.allowed) return rateLimitedResponse(limitDecision);

  const parsed = mediaWorldSignupSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Please correct the highlighted fields.', fields: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { name, email, phone, password, division, district, presentAddress, bio } = parsed.data;
  const passwordHash = await hashPassword(password);
  let username = createSuggestedUserId(name);

  for (let attempt = 0; attempt < 5; attempt += 1) {
    if (await prisma.user.findUnique({ where: { username }, select: { id: true } })) {
      username = createSuggestedUserId(name);
      continue;
    }

    try {
      const user = await prisma.user.create({
        data: {
          name,
          username,
          email,
          phone,
          passwordHash,
          division,
          district,
          presentAddress,
          bio,
          accountType: 'PROFESSIONAL',
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
          bio: true,
        },
      });
      const session = await createSession(user.id);
      await setSessionCookie(session.token, session.expiresAt);
      return NextResponse.json({ user }, { status: 201 });
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
      console.error('[mediaworld/signup POST] error:', error);
      return NextResponse.json({ error: 'Unable to create your account. Please try again.' }, { status: 500 });
    }
  }

  return NextResponse.json({ error: DUPLICATE_USERNAME, fields: { username: [DUPLICATE_USERNAME] } }, { status: 409 });
}
