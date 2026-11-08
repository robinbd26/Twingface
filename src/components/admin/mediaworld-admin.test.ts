import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

const PANELS = [
  'src/components/admin/mediaworld-admin.tsx',
  'src/components/admin/admin-ui.tsx',
  'src/components/admin/admin-taxonomy.tsx',
  'src/components/admin/admin-listings.tsx',
  'src/components/admin/admin-reports.tsx',
  'src/components/admin/admin-inquiries.tsx',
  'src/components/admin/admin-accounts.tsx',
];

describe('Media World admin panel', () => {
  it.each(PANELS)('keeps %s free of booking claims and credential fields', (path) => {
    const workspace = source(path);

    expect(workspace).not.toMatch(/book/i);
    expect(workspace).not.toMatch(/passwordHash|SUPER_ADMIN_PASSWORD/);
    expect(workspace).not.toContain('dangerouslySetInnerHTML');
  });

  it.each(PANELS)('styles %s inline instead of editing the shared dashboard stylesheet', (path) => {
    expect(source(path)).not.toContain('dashboard.css');
  });

  it('gates every mutating taxonomy action behind a second confirmation', () => {
    const taxonomy = source('src/components/admin/admin-taxonomy.tsx');

    expect(taxonomy).toContain('ConfirmButton');
    expect(taxonomy).toContain('Confirm deactivate');
    expect(taxonomy).toContain('Confirm delete');
    expect(taxonomy).toContain('Confirm rename');
    expect(taxonomy).toContain('Confirm move');
    expect(taxonomy).toContain('/api/mediaworld/admin/taxonomy');
  });

  it('offers hard delete only when nothing references the node and explains deactivation', () => {
    const taxonomy = source('src/components/admin/admin-taxonomy.tsx');

    expect(taxonomy).toContain('disabled={refs.blocked}');
    expect(taxonomy).toContain('Referenced by');
    expect(taxonomy).toContain('No member data references this node');
  });

  it('hides and restores listings but never deletes them', () => {
    const listings = source('src/components/admin/admin-listings.tsx');

    expect(listings).toContain("'hide'");
    expect(listings).toContain("'restore'");
    expect(listings).toContain('never deleted from the admin panel');
    expect(listings).not.toMatch(/sendJson\([^)]*'DELETE'\)/);
    expect(listings).not.toMatch(/mutate\([^)]*,'DELETE'/);
  });

  it('walks reports through the documented status flow with confirmation', () => {
    const reports = source('src/components/admin/admin-reports.tsx');

    expect(reports).toContain('IN_REVIEW');
    expect(reports).toContain('RESOLVED');
    expect(reports).toContain('DISMISSED');
    expect(reports).toContain('ConfirmButton');
    expect(reports).toContain('Closed — no further action.');
  });

  it('keeps the inquiry overview read-only', () => {
    const inquiries = source('src/components/admin/admin-inquiries.tsx');

    expect(inquiries).toContain('/api/mediaworld/admin/inquiries');
    expect(inquiries).not.toContain('mutate(');
    expect(inquiries).toContain('Read-only overview');
  });

  it('reuses the existing legacy approval route for media profiles', () => {
    const accounts = source('src/components/admin/admin-accounts.tsx');

    expect(accounts).toContain('/api/mediaworld/approval/');
    expect(accounts).toContain('/api/mediaworld/admin/accounts/');
    expect(accounts).toContain('ConfirmButton');
  });

  it('shows loading states, error banners and honest empty states in every panel', () => {
    for (const path of ['admin-taxonomy', 'admin-listings', 'admin-reports', 'admin-inquiries', 'admin-accounts']) {
      const workspace = source(`src/components/admin/${path}.tsx`);

      expect(workspace).toContain('AlertBanner');
      expect(workspace).toContain('Loading');
      expect(workspace).toContain('EmptyState');
    }
  });

  it('renders exactly the five documented admin sections', () => {
    const shell = source('src/components/admin/mediaworld-admin.tsx');

    expect(shell).toContain("label: 'Taxonomy'");
    expect(shell).toContain("label: 'Rental listings'");
    expect(shell).toContain("label: 'Reports'");
    expect(shell).toContain("label: 'Inquiries'");
    expect(shell).toContain("label: 'Accounts'");
    expect(shell).toContain('id="media-world-admin"');
  });

  it('spells singular entity and count labels from explicit maps instead of trimming an s', () => {
    const taxonomy = source('src/components/admin/admin-taxonomy.tsx');
    const accounts = source('src/components/admin/admin-accounts.tsx');

    expect(taxonomy).not.toContain("replace(/s$/, '')");
    expect(taxonomy).toContain("singular: 'industry'");
    expect(taxonomy).toContain('Add ${ENTITY_SINGULAR[entity]}');
    expect(accounts).not.toContain('sent inquiry/inquiries');
  });
});
