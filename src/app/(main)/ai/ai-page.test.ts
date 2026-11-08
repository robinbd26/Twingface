import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('Twingface AI page contract', () => {
  it('states honestly that the assistant does not exist yet instead of faking a chat workspace', () => {
    const page = source('src/app/(main)/ai/page.tsx');

    expect(page).toContain("data-testid='coming-soon-ai'");
    expect(page).toContain('Twingface AI is not available yet');
    expect(existsSync(resolve(process.cwd(), 'src/components/ai/twingface-ai-workspace.tsx'))).toBe(false);

    // Nothing invented is presented as product data.
    expect(page).not.toContain('recentChats');
    expect(page).not.toContain('Upgrade');
    expect(page).not.toContain('Free plan');
  });

  it('keeps the route behind a session', () => {
    expect(source('src/app/(main)/ai/page.tsx')).toContain("if (!user) redirect('/login')");
  });
});
