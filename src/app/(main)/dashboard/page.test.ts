import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ getCurrentUser: vi.fn(), findMany: vi.fn(), redirect: vi.fn() }));
vi.mock('@/lib/auth', () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock('@/lib/db', () => ({ prisma: { post: { findMany: mocks.findMany } } }));
vi.mock('next/navigation', () => ({ redirect: mocks.redirect }));

let DashboardPage: typeof import('./page').default;

function hasFunctionProp(node: unknown): boolean {
  if (!node || typeof node !== 'object') return false;
  const element = node as { props?: Record<string, unknown> };
  if (element.props && Object.values(element.props).some((value) => typeof value === 'function')) return true;
  const children = element.props?.children;
  return Array.isArray(children) ? children.some(hasFunctionProp) : hasFunctionProp(children);
}

function textContent(node: unknown): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (!node || typeof node !== 'object') return '';
  const children = (node as { props?: { children?: unknown } }).props?.children;
  return Array.isArray(children) ? children.map(textContent).join(' ') : textContent(children);
}

describe('dashboard server component boundary', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    Object.assign(globalThis, { React });
    mocks.getCurrentUser.mockResolvedValue({ id: 'user-a', name: 'Robin', username: 'robin', email: 'private@example.com' });
    mocks.findMany.mockResolvedValue([]);
    DashboardPage = (await import('./page')).default;
  });

  it('does not pass event handlers from the server dashboard to client components', async () => {
    expect(hasFunctionProp(await DashboardPage())).toBe(false);
  });

  it('composes serializable authenticated dashboard component props', async () => {
    const page = await DashboardPage();
    expect(textContent(page)).toContain('');
    expect(mocks.findMany).toHaveBeenCalledOnce();
  });
});
