import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('Games workspace', () => {
  it('provides standard-shell game browsing and an embedded player modal contract', () => {
    const page = source('src/app/(main)/games/page.tsx');
    expect(page).toContain("from '@/components/games/games-workspace'");
    const workspace = source('src/components/games/games-workspace.tsx');
    expect(workspace).toContain('Search games');
    expect(workspace).toContain('/api/games/${gameId}/play');
    expect(workspace).toContain('GamePlayerModal');
  });

  it('keeps only sidebar controls that are backed by data', () => {
    const workspace = source('src/components/games/games-workspace.tsx');

    // No favorites, history, leaderboard or tournament models exist yet.
    expect(workspace).not.toContain('Recently Played');
    expect(workspace).not.toContain('Favorites');
    expect(workspace).not.toContain('Leaderboard');
    expect(workspace).not.toContain('Weekly Tournaments');
    expect(workspace).toContain('games-side-genres');
  });
});
