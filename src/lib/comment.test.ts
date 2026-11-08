import { describe, expect, it } from 'vitest';
import { DEFAULT_COMMENTS_PER_PAGE, MAX_COMMENTS_PER_PAGE, parseCommentLimit, safeCommentSelect } from './comment';

describe('comment helpers', () => {
  it('bounds comment page sizes safely', () => {
    expect(parseCommentLimit(null)).toBe(DEFAULT_COMMENTS_PER_PAGE);
    expect(parseCommentLimit('0')).toBe(DEFAULT_COMMENTS_PER_PAGE);
    expect(parseCommentLimit('999')).toBe(MAX_COMMENTS_PER_PAGE);
  });

  it('selects only safe comment and author fields', () => {
    expect(safeCommentSelect).toMatchObject({ id: true, content: true, author: { select: { id: true, name: true, username: true, profileImage: true } } });
    const serialized = JSON.stringify(safeCommentSelect);
    expect(serialized).not.toContain('passwordHash');
    expect(serialized).not.toContain('email');
    expect(serialized).not.toContain('phone');
    expect(serialized).not.toContain('token');
  });
});
