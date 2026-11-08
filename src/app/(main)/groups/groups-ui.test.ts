import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const read = (file: string) => readFileSync(path.join(process.cwd(), file), 'utf8');

describe('groups UI contract', () => {
  it('links dashboard navigation to Groups and provides a safe create form', () => {
    expect(read('src/components/dashboard/dashboard-sidebar.tsx')).toContain("href: '/groups'");
    expect(read('src/components/dashboard/dashboard-navbar.tsx')).toContain("Groups: '/groups'");
    const form = read('src/components/groups/group-form.tsx');
    expect(form).toContain("fetch('/api/groups'");
    expect(form).toContain('postingPolicy');
    expect(form).toContain('privacy');
  });

  it('renders Groups landing, creation, and wall routes', () => {
    expect(read('src/app/(main)/groups/page.tsx')).toContain('Your groups');
    expect(read('src/app/(main)/groups/create/page.tsx')).toContain('Create group');
    expect(read('src/app/(main)/groups/[handle]/page.tsx')).toContain('Request to join');
  });
});
