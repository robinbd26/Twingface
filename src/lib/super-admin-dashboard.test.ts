import { describe, expect, it } from 'vitest';
import { buildDailySeries, buildModuleAvailability, buildRecentActivities } from '@/lib/super-admin-dashboard';

describe('super admin dashboard helpers', () => {
  it('creates a zero-safe inclusive 30 day series and includes events at the lower boundary', () => {
    const end = new Date('2026-10-19T12:00:00.000Z');
    const start = new Date('2026-09-20T00:00:00.000Z');

    const series = buildDailySeries({
      end,
      days: 30,
      registrations: [start.toISOString(), '2026-10-19T08:00:00.000Z'],
      posts: ['2026-10-19T09:00:00.000Z'],
    });

    expect(series).toHaveLength(30);
    expect(series[0]).toMatchObject({ date: '2026-09-20', users: 1, posts: 0 });
    expect(series.at(-1)).toMatchObject({ date: '2026-10-19', users: 1, posts: 1 });
    expect(series.some((day) => day.users === 0 && day.posts === 0)).toBe(true);
  });

  it('orders mixed serializable activities from newest to oldest', () => {
    const activities = buildRecentActivities([
      { id: 'post-1', type: 'POST', title: 'A post was created', createdAt: '2026-10-17T08:00:00.000Z' },
      { id: 'user-1', type: 'USER', title: 'A user joined', createdAt: '2026-10-18T08:00:00.000Z' },
      { id: 'game-1', type: 'GAME', title: 'A game was added', createdAt: '2026-10-16T08:00:00.000Z' },
    ]);

    expect(activities.map((activity) => activity.id)).toEqual(['user-1', 'post-1', 'game-1']);
  });

  it('labels modules without an observable integration as not connected', () => {
    expect(buildModuleAvailability('ott')).toEqual({ label: 'OTT streaming', state: 'NOT_CONNECTED', detail: 'Not connected' });
  });
});
