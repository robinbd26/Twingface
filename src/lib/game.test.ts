import { describe, expect, it } from 'vitest';
import { isTrustedGameUrl, parseGameBrowseInput, parseGameCreateInput, toEmbeddableGameUrl } from './game';

describe('game validation', () => {
  it('allows only trusted game URLs', () => {
    expect(isTrustedGameUrl('https://games.twingface.com/play/runner')).toBe(true);
    expect(isTrustedGameUrl('https://www.crazygames.com/game/racing-limits')).toBe(true);
    expect(isTrustedGameUrl('http://localhost:3001/play/runner')).toBe(true);
    expect(isTrustedGameUrl('https://games.twingface.com.evil.test/play')).toBe(false);
    expect(isTrustedGameUrl('https://user:pass@games.twingface.com/play')).toBe(false);
    expect(isTrustedGameUrl('javascript:alert(1)')).toBe(false);
  });

  it('bounds browsing and rejects an untrusted playable URL', () => {
    expect(parseGameBrowseInput(new URLSearchParams({ genre: 'RACING', query: ' drift ' }))).toMatchObject({ genre: 'RACING', query: 'drift' });
    expect(parseGameCreateInput({ title: 'Drift Rush', slug: 'drift-rush', description: 'A fast racing game.', genre: 'RACING', thumbnailUrl: 'https://images.example.com/drift.jpg', playUrl: 'https://evil.example/play' }).success).toBe(false);
  });

  it('normalizes CrazyGames pages to the embeddable player URL', () => {
    expect(toEmbeddableGameUrl('https://www.crazygames.com/game/racing-limits')).toBe('https://games.crazygames.com/en_US/racing-limits/index.html');
    expect(toEmbeddableGameUrl('https://www.crazygames.com/embed/downhill-racer-bvk')).toBe('https://games.crazygames.com/en_US/downhill-racer-bvk/index.html');
    const created = parseGameCreateInput({ title: 'Racing Limits', slug: 'racing-limits', description: 'A fast racing game with traffic.', genre: 'RACING', thumbnailUrl: 'https://images.example.com/drift.jpg', playUrl: 'https://www.crazygames.com/game/racing-limits' });
    expect(created.success && created.data.playUrl).toBe('https://games.crazygames.com/en_US/racing-limits/index.html');
  });
});
