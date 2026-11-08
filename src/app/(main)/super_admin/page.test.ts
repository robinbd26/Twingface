import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  redirect: vi.fn(),
  user: { count: vi.fn(), findMany: vi.fn() },
  userPresence: { count: vi.fn(), findMany: vi.fn() },
  post: { count: vi.fn(), findMany: vi.fn() },
  marketplaceListing: { count: vi.fn(), findMany: vi.fn() },
  game: { count: vi.fn(), findMany: vi.fn() },
  mediaProfile: { count: vi.fn(), findMany: vi.fn() },
}));

vi.mock('@/lib/auth', () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock('@/lib/db', () => ({ prisma: {
  user: mocks.user,
  userPresence: mocks.userPresence,
  post: mocks.post,
  marketplaceListing: mocks.marketplaceListing,
  game: mocks.game,
  mediaProfile: mocks.mediaProfile,
} }));
vi.mock('next/navigation', () => ({ redirect: mocks.redirect }));
vi.mock('@/components/super-admin/super-admin-dashboard', () => ({
  default: ({ admin, data }: { admin: { name: string }; data: { metrics: { totalUsers: number } } }) =>
    React.createElement('main', null, `${admin.name} ${data.metrics.totalUsers}`),
}));
vi.mock('@/components/admin/mediaworld-admin', () => ({
  default: () => React.createElement('section', { id: 'media-world-admin' }, 'Media World admin'),
}));

let SuperAdminPage: typeof import('./page').default;
let CanonicalSuperAdminPage: typeof import('../super_admin/page').default;

describe('super admin server route', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    Object.assign(globalThis, { React });
    Object.values(mocks).forEach((mock) => {
      if (typeof mock === 'object') Object.values(mock).forEach((method) => method.mockResolvedValue?.([]));
    });
    mocks.user.count.mockResolvedValue(7);
    mocks.userPresence.count.mockResolvedValue(2);
    mocks.post.count.mockResolvedValue(11);
    mocks.marketplaceListing.count.mockResolvedValue(4);
    mocks.game.count.mockResolvedValue(3);
    mocks.mediaProfile.count.mockResolvedValue(1);
    mocks.user.findMany.mockResolvedValue([]);
    mocks.userPresence.findMany.mockResolvedValue([
      { isOnline: true, lastActiveAt: new Date() },
      { isOnline: true, lastActiveAt: new Date() },
    ]);
    mocks.post.findMany.mockResolvedValue([]);
    mocks.marketplaceListing.findMany.mockResolvedValue([]);
    mocks.game.findMany.mockResolvedValue([]);
    mocks.mediaProfile.findMany.mockResolvedValue([]);
    SuperAdminPage = (await import('./page')).default;
    CanonicalSuperAdminPage = (await import('../super_admin/page')).default;
  });

  it('serves the dashboard at the documented hyphenated route', () => {
    expect(CanonicalSuperAdminPage).toBe(SuperAdminPage);
  });

  it('redirects visitors without a session to login', async () => {
    mocks.getCurrentUser.mockResolvedValue(null);

    await SuperAdminPage();

    expect(mocks.redirect).toHaveBeenCalledWith('/login');
  });

  it('redirects a normal authenticated user to the member dashboard', async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: 'user-1', role: 'USER' });

    await SuperAdminPage();

    expect(mocks.redirect).toHaveBeenCalledWith('/dashboard');
  });

  it('composes real aggregate data for a super admin without server event handlers', async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: 'admin-1', name: 'Admin', username: 'admin', profileImage: null, role: 'SUPER_ADMIN' });

    const page = await SuperAdminPage();
    type DashboardElement = React.ReactElement<{ admin: { name: string; username: string }; data: { metrics: Record<string, number> } }>;
    const [dashboard, mediaWorld] = page.props.children as [DashboardElement, React.ReactElement];
    const mediaWorldPanel = await import('@/components/admin/mediaworld-admin');

    expect(dashboard.props.data.metrics).toMatchObject({ totalUsers: 7, onlineUsers: 2, totalPosts: 11, marketplaceListings: 4, games: 3, pendingApprovals: 1 });
    expect(dashboard.props.admin).toMatchObject({ name: 'Admin', username: 'admin' });
    expect(mediaWorld.type).toBe(mediaWorldPanel.default);
    expect(mocks.user.count).toHaveBeenCalledOnce();
    expect(mocks.mediaProfile.findMany).toHaveBeenCalledOnce();
  });
});
