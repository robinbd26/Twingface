import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('Super Admin dashboard workspace', () => {
  it('renders the approved admin console, current metrics, safe unavailable states and approval flow', () => {
    const workspace = source('src/components/super-admin/super-admin-dashboard.tsx');

    expect(workspace).toContain('super-admin-shell');
    expect(workspace).toContain('Dashboard');
    expect(workspace).toContain('User Management');
    expect(workspace).toContain('Social Platform');
    expect(workspace).toContain('Entertainment');
    expect(workspace).toContain('Business & Marketplace');
    expect(workspace).toContain('Trust & Safety');
    expect(workspace).toContain('System & Operations');
    expect(workspace).toContain('Total Users');
    expect(workspace).toContain('Online Now');
    expect(workspace).toContain('Platform Growth Overview');
    expect(workspace).toContain('Quick Access');
    expect(workspace).toContain('Not connected');
    expect(workspace).toContain('/api/mediaworld/approval/${id}');
    expect(workspace).toContain('setApprovalError');
    expect(workspace).toContain('setSidebarOpen');
    expect(workspace).not.toContain('useMemo');
  });

  it('keeps console styling scoped and removes the obsolete MediaWorld-only panel', () => {
    const styles = source('src/app/dashboard.css');

    expect(styles).toContain('.super-admin-shell');
    expect(styles).toContain('.super-admin-sidebar');
    expect(styles).toContain('@media (max-width:1100px)');
    expect(styles).toContain('@media (max-width:720px)');
    expect(existsSync(resolve(process.cwd(), 'src/components/mediaworld/mediaworld-admin-dashboard.tsx'))).toBe(false);
  });

  it('renders relative times from the server timestamp so hydration matches', () => {
    const workspace = source('src/components/super-admin/super-admin-dashboard.tsx');
    const page = source('src/app/(main)/super_admin/page.tsx');

    expect(workspace).toMatch(/function relativeTime\(value: string, now: number\)/);
    expect(workspace).not.toMatch(/Date\.now\(\)/);
    expect(workspace).toContain('generatedAt');
    expect(page).toContain('generatedAt={end.toISOString()}');
  });
});
