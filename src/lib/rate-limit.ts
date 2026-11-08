import { prisma } from '@/lib/db';

export type RateLimitRule = { limit: number; windowMs: number };

export type RateLimitDecision = { allowed: boolean; remaining: number; retryAfterSeconds: number };

export const RATE_LIMIT_MESSAGE = 'Too many attempts. Please try again later.';

export const LOGIN_IP_RULE: RateLimitRule = { limit: 30, windowMs: 15 * 60 * 1000 };
export const LOGIN_IDENTIFIER_RULE: RateLimitRule = { limit: 5, windowMs: 15 * 60 * 1000 };
export const SIGNUP_IP_RULE: RateLimitRule = { limit: 5, windowMs: 60 * 60 * 1000 };

type CounterRow = { count: number; retry_after_seconds: number };

function pruneExpired(): Promise<number> {
  return prisma.$executeRaw`DELETE FROM "rate_limit_counters" WHERE "reset_at" < NOW()`;
}

/**
 * Counts one attempt against a fixed-window key.
 *
 * The increment and window rollover run in a single statement so concurrent
 * requests cannot race past the limit.
 */
export async function consumeRateLimit(key: string, rule: RateLimitRule): Promise<RateLimitDecision> {
  const resetAt = new Date(Date.now() + rule.windowMs);
  const rows = await prisma.$queryRaw<CounterRow[]>`
    INSERT INTO "rate_limit_counters" ("key", "count", "reset_at", "updated_at")
    VALUES (${key}, 1, ${resetAt}, NOW())
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "rate_limit_counters"."reset_at" <= NOW() THEN 1 ELSE "rate_limit_counters"."count" + 1 END,
      "reset_at" = CASE WHEN "rate_limit_counters"."reset_at" <= NOW() THEN ${resetAt}::timestamptz ELSE "rate_limit_counters"."reset_at" END,
      "updated_at" = NOW()
    RETURNING "count", GREATEST(1, CEIL(EXTRACT(EPOCH FROM ("reset_at" - NOW())))::int) AS "retry_after_seconds"
  `;
  const row = rows[0];
  if (!row) return { allowed: true, remaining: rule.limit, retryAfterSeconds: 0 };

  if (row.count === 1) void pruneExpired().catch(() => {});

  const count = Number(row.count);
  return { allowed: count <= rule.limit, remaining: Math.max(0, rule.limit - count), retryAfterSeconds: Number(row.retry_after_seconds) };
}

export async function resetRateLimit(key: string): Promise<void> {
  await prisma.$executeRaw`DELETE FROM "rate_limit_counters" WHERE "key" = ${key}`;
}

export function rateLimitedResponse(decision: RateLimitDecision): Response {
  return Response.json(
    { error: RATE_LIMIT_MESSAGE },
    { status: 429, headers: { 'Retry-After': String(decision.retryAfterSeconds) } },
  );
}

export function clientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const first = forwarded?.split(',')[0]?.trim();
  if (first) return first;
  return request.headers.get('x-real-ip')?.trim() || 'unknown';
}

export function loginIpKey(ip: string): string {
  return `login:ip:${ip}`;
}

export function loginIdentifierKey(kind: string, value: string): string {
  return `login:id:${kind}:${value}`;
}

export function signupIpKey(scope: 'register' | 'mediaworld' | 'rental', ip: string): string {
  return `signup:${scope}:ip:${ip}`;
}
