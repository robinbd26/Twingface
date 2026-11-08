import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const mocks = vi.hoisted(() => ({ getCurrentUser: vi.fn(), findMany: vi.fn(), redirect: vi.fn(() => { throw new Error('redirect:/login'); }) }));

vi.mock('@/lib/auth', () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock('@/lib/db', () => ({ prisma: { page: { findMany: mocks.findMany } } }));
vi.mock('next/navigation', () => ({ redirect: mocks.redirect }));

import PagesPage from './page';
import CreatePagePage from './create/page';

describe('pages screens', () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.getCurrentUser.mockResolvedValue(null); });

  it.each([['pages', PagesPage], ['create page', CreatePagePage]])('redirects unauthenticated users from %s', async (_name, Page) => {
    await expect(Page()).rejects.toThrow('redirect:/login');
    expect(mocks.findMany).not.toHaveBeenCalled();
  });

  it('renders the approved dark pages template with a create action', () => {
    const pageSource = readFileSync(resolve(process.cwd(), 'src/app/(main)/pages/page.tsx'), 'utf8');
    const css = readFileSync(resolve(process.cwd(), 'src/app/dashboard.css'), 'utf8');

    expect(pageSource).toContain("data-theme='dark'");
    expect(pageSource).toContain('<DashboardNavbar');
    expect(pageSource).toContain("className='fb-hero surface pages-hero'");
    expect(pageSource).toContain('href=\'/pages/create\'');
    expect(css).toContain('.pages-hero .fb-id-row{margin-top:0;padding:24px 0}');
  });

  it('creates pages through the validated API contract only', () => {
    const formSource = readFileSync(resolve(process.cwd(), 'src/app/(main)/pages/create/create-page-form.tsx'), 'utf8');
    const routeSource = readFileSync(resolve(process.cwd(), 'src/app/api/pages/route.ts'), 'utf8');

    expect(formSource).toContain('fetch(\'/api/pages\'');
    expect(routeSource).toContain('CreatePageSchema');
    expect(routeSource).toContain('Authentication is required.');
  });
});
