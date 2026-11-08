import { describe, expect, it } from 'vitest';
import { DEFAULT_FRIENDS_PER_PAGE, MAX_FRIENDS_PER_PAGE, parseFriendLimit } from './friendship';

describe('friend pagination', () => {
  it('defaults invalid limits and caps oversized limits', () => {
    expect(parseFriendLimit(null)).toBe(DEFAULT_FRIENDS_PER_PAGE);
    expect(parseFriendLimit('0')).toBe(DEFAULT_FRIENDS_PER_PAGE);
    expect(parseFriendLimit('999')).toBe(MAX_FRIENDS_PER_PAGE);
    expect(parseFriendLimit('12')).toBe(12);
  });
});
