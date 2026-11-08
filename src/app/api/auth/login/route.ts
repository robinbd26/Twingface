import { NextResponse } from 'next/server';
import { DUMMY_PASSWORD_HASH, createSession, setSessionCookie, verifyPassword } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { loginSchema } from '@/lib/validations';
import { GENERIC_INVALID_CREDENTIALS as INVALID_CREDENTIALS } from '@/lib/login-messages';
import {
  LOGIN_IDENTIFIER_RULE,
  LOGIN_IP_RULE,
  clientIp,
  consumeRateLimit,
  loginIdentifierKey,
  loginIpKey,
  rateLimitedResponse,
  resetRateLimit,
} from '@/lib/rate-limit';

export async function POST(req: Request) {
  const ipDecision = await consumeRateLimit(loginIpKey(clientIp(req)), LOGIN_IP_RULE);
  if (!ipDecision.allowed) return rateLimitedResponse(ipDecision);

  const body: unknown = await req.json().catch(() => null);
  const candidate = body && typeof body === 'object' && !Array.isArray(body)
    ? {
        ...(body as Record<string, unknown>),
        identifier: 'identifier' in body && (body as Record<string, unknown>).identifier !== undefined
          ? (body as Record<string, unknown>).identifier
          : (body as Record<string, unknown>).email,
      }
    : body;
  const parsed = loginSchema.safeParse(candidate);
  if (!parsed.success) return NextResponse.json({ error: INVALID_CREDENTIALS }, { status: 401 });
  const { identifier, password } = parsed.data;

  // Counted before the lookup so throttling behaves the same for unknown and
  // known identifiers (no account enumeration through 429s); reset on success.
  const identifierKey = loginIdentifierKey(identifier.kind, identifier.value);
  const identifierDecision = await consumeRateLimit(identifierKey, LOGIN_IDENTIFIER_RULE);
  if (!identifierDecision.allowed) return rateLimitedResponse(identifierDecision);

  const where = identifier.kind === 'email'
    ? { email: identifier.value }
    : identifier.kind === 'phone'
      ? { phone: identifier.value }
      : { username: identifier.value };
  const user = await prisma.user.findUnique({ where, select: { id: true, name: true, username: true, email: true, passwordHash: true, role: true, accountType: true } });
  const passwordHash = user?.passwordHash ?? DUMMY_PASSWORD_HASH;
  const passwordValid = await verifyPassword(password, passwordHash);
  if (!user || !passwordValid) return NextResponse.json({ error: INVALID_CREDENTIALS }, { status: 401 });

  await resetRateLimit(identifierKey);
  const session = await createSession(user.id);
  await setSessionCookie(session.token, session.expiresAt);
  return NextResponse.json({ user: { id: user.id, name: user.name, username: user.username, email: user.email, role: user.role, accountType: user.accountType } });
}
