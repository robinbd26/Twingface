import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('Fallback routes for links that had no page', () => {
  it('resolves /settings to the profile settings page', () => {
    expect(source('src/app/(main)/settings/page.tsx')).toContain("redirect('/settings/profile')");
  });

  it('resolves /friends/requests to the friends page, which already opens on the requests tab', () => {
    expect(source('src/app/(main)/friends/requests/page.tsx')).toContain("redirect('/friends')");
    expect(source('src/components/friends/friends-tabs.tsx')).toContain("useState<'requests' | 'all'>('requests')");
    expect(source('src/components/dashboard/dashboard-right-rail.tsx')).toContain("href='/friends/requests'");
  });

  it('marks the admin panel Global Settings entry as unavailable instead of linking to a page that does not exist', () => {
    const dashboard = source('src/components/super-admin/super-admin-dashboard.tsx');

    expect(dashboard).toContain("{ label: 'Global Settings' }");
    expect(dashboard).not.toContain("{ label: 'Global Settings', href: '/settings' }");
  });
});
