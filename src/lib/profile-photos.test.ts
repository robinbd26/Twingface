import { describe, expect, it } from 'vitest';
import { parseProfilePhotoLimit, safeProfilePhotoSelect } from './profile-photos';

describe('profile photo helpers', () => {
  it.each([
    [null, 24],
    ['', 24],
    ['0', 24],
    ['-1', 24],
    ['hello', 24],
    ['25', 25],
    ['999', 50],
  ])('normalizes photo page limit %s to %i', (value, expected) => {
    expect(parseProfilePhotoLimit(value)).toBe(expected);
  });

  it('selects only public photo metadata', () => {
    expect(safeProfilePhotoSelect).toEqual({ id: true, imageUrl: true, createdAt: true });
  });
});
