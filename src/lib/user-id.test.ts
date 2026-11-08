import { describe, expect, it } from 'vitest';
import { createSuggestedUserId } from './user-id';

describe('createSuggestedUserId', () => {
  it('creates a normalized, name-based User ID with a unique suffix', () => {
    expect(createSuggestedUserId(' Robin Mondol ', '4821ab')).toBe('robin.mondol-4821ab');
  });

  it('uses a valid fallback for names without Latin letters', () => {
    expect(createSuggestedUserId('রবিন মন্ডল', '4821ab')).toBe('user-4821ab');
  });
});
