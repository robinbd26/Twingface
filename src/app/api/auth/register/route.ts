import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { createSession, hashPassword, setSessionCookie } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { normalizeContact, registerSchema } from '@/lib/validations';
import { createSuggestedUserId } from '@/lib/user-id';
import { SIGNUP_IP_RULE, clientIp, consumeRateLimit, rateLimitedResponse, signupIpKey } from '@/lib/rate-limit';

export async function POST(req: Request) {
  const limitDecision = await consumeRateLimit(signupIpKey('register', clientIp(req)), SIGNUP_IP_RULE);
  if (!limitDecision.allowed) return rateLimitedResponse(limitDecision);

  const parsed = registerSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Please correct the highlighted fields.', fields: parsed.error.flatten().fieldErrors }, { status: 400 });
  const { name, username: requestedUsername, contact, gender, dobDay, dobMonth, dobYear, division, district, password } = parsed.data;
  const { email, phone } = normalizeContact(contact);
  // normalizeContact agrees with the zod contact check; guard anyway.
  if (!email && !phone) return NextResponse.json({ error: 'Enter a valid email address or Bangladeshi mobile number.', fields: { contact: ['Enter a valid email address or Bangladeshi mobile number.'] } }, { status: 400 });
  const dateOfBirth = dobDay && dobMonth && dobYear ? new Date(Date.UTC(dobYear, dobMonth - 1, dobDay)) : null;
  let username = requestedUsername || createSuggestedUserId(name);
  for (let attempt = 0; attempt < 5; attempt += 1) {
    if (await prisma.user.findUnique({ where: { username }, select: { id: true } })) {
      username = createSuggestedUserId(name);
      continue;
    }
    try {
      const user = await prisma.user.create({
        data: { name, username, email, phone, gender, dateOfBirth, division, district, passwordHash: await hashPassword(password) },
        select: { id: true, name: true, username: true, email: true, phone: true, gender: true, dateOfBirth: true, division: true, district: true },
      });
      const session = await createSession(user.id);
      await setSessionCookie(session.token, session.expiresAt);
      return NextResponse.json({ user }, { status: 201 });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const raw = Array.isArray(error.meta?.target) ? error.meta?.target.join(',') : String(error.meta?.target ?? '');
        if (raw.includes('username') && attempt < 4) { username = createSuggestedUserId(name); continue; }
        const field = raw.includes('username') ? 'username' : raw.includes('phone') ? 'contact' : 'contact';
        const message = field === 'username' ? 'Unable to create a unique User ID. Please try again.' : email ? 'That email is already in use.' : 'That mobile number is already in use.';
        return NextResponse.json({ error: message, fields: { [field]: [message] } }, { status: 409 });
      }
      console.error('Registration failed', error);
      return NextResponse.json({ error: 'Unable to create your account. Please try again.' }, { status: 500 });
    }
  }
  return NextResponse.json({ error: 'Unable to create a unique User ID. Please try again.', fields: { username: ['Unable to create a unique User ID. Please try again.'] } }, { status: 409 });
}
