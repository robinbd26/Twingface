import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  let db: { connected: boolean; latencyMs?: number } = { connected: false };

  try {
    const start = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    db = { connected: true, latencyMs: Date.now() - start };
  } catch (error) {
    // Driver messages carry host, port and sometimes credential hints.
    console.error('[health] database check failed:', error);
  }

  return NextResponse.json({
    status: db.connected ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    db,
  });
}
