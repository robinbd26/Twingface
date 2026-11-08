import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(resolve(process.cwd(), 'src/app/(main)/channelhub/page.tsx'), 'utf8');
const stylesheet = readFileSync(resolve(process.cwd(), 'src/app/dashboard.css'), 'utf8');

describe('ChannelHub placeholder page', () => {
  it('is a session-gated page that keeps the Twingface navbar', () => {
    expect(source).toContain("import { getCurrentUser } from '@/lib/auth'");
    expect(source).toContain("if (!user) redirect('/login')");
    expect(source).toContain('<DashboardNavbar');
    expect(source).toContain("data-theme='dark'");
  });

  it('renders the themed coming-soon card with routes back into the hub', () => {
    expect(source).toContain("className='channelhub-page'");
    expect(source).toContain("className='channelhub-card'");
    expect(source).toContain('ChannelHub is coming soon');
    expect(source).toContain("href='/mediaworld'");
    expect(source).toContain('← Back to Media World');
    expect(source).toContain("href='/for-rent'");
  });

  it('ships matching theme styles', () => {
    expect(stylesheet).toContain('.channelhub-page{');
    expect(stylesheet).toContain('.channelhub-card{');
    expect(stylesheet).toContain('.channelhub-btn-primary{');
  });
});
