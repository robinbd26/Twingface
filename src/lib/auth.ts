import argon2 from 'argon2';
import { createHash, randomBytes } from 'crypto';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';

export const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000;
export const SESSION_COOKIE_NAME = process.env.NODE_ENV === 'production' ? '__Host-twingface_session' : 'twingface_session';

export type AuthUser = {
  id: string;
  name: string;
  username: string;
  email: string | null;
  profileImage: string | null;
  phone?: string | null;
  role: 'USER' | 'SUPER_ADMIN';
};

const safeUserSelect = { id: true, name: true, username: true, email: true, profileImage: true, role: true } as const;

/**
 * Valid Argon2id hash of a random throwaway password. Unknown identifiers are
 * verified against it so both login branches pay the same hashing cost and
 * response timing cannot reveal which accounts exist.
 */
export const DUMMY_PASSWORD_HASH = '$argon2id$v=19$m=65536,t=3,p=4$EExseu/gnhAL7Z/Tl8nVqg$YNLbjW1kD8U8a0uhUTcGnVwKCos6DphLAu+L73Mhtlg';

export function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, { type: argon2.argon2id });
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  try {
    return await argon2.verify(storedHash, password);
  } catch {
    return false;
  }
}

export function createSessionToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function sessionCookieOptions(expires: Date, production = process.env.NODE_ENV === 'production') {
  return { httpOnly: true, sameSite: 'lax' as const, secure: production, path: '/', expires };
}

export async function createSession(userId: string): Promise<{ token: string; expiresAt: Date }> {
  const token = createSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  await prisma.session.create({ data: { tokenHash: hashSessionToken(token), userId, expiresAt } });
  return { token, expiresAt };
}

export async function setSessionCookie(token: string, expiresAt: Date): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, sessionCookieOptions(expiresAt));
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, '', sessionCookieOptions(new Date(0)));
}

export async function getSessionToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE_NAME)?.value ?? null;
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const token = await getSessionToken();
  if (!token) return null;
  const tokenHash = hashSessionToken(token);
  const session = await prisma.session.findUnique({
    where: { tokenHash },
    select: { expiresAt: true, user: { select: safeUserSelect } },
  });
  if (!session) return null;
  if (session.expiresAt <= new Date()) {
    await prisma.session.deleteMany({ where: { tokenHash } });
    await clearSessionCookie();
    return null;
  }
  return session.user;
}

export async function deleteSession(token: string): Promise<void> {
  await prisma.session.deleteMany({ where: { tokenHash: hashSessionToken(token) } });
}

export async function logoutCurrentSession(): Promise<void> {
  const token = await getSessionToken();
  if (token) await deleteSession(token);
  await clearSessionCookie();
}
