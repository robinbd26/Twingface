import { describe, expect, it } from 'vitest';
import { safePostSelect } from './post';

describe('safe post projection', () => {
  it('exposes public image, feeling, and comment count metadata but keeps internal fields private', () => {
    expect(safePostSelect).toMatchObject({ imageUrl: true, feelingActivity: true, youtubeUrl: true, _count: { select: { comments: true } } });
    expect(safePostSelect).not.toHaveProperty('imagePublicId');
    const serialized = JSON.stringify(safePostSelect);
    expect(serialized).not.toContain('passwordHash');
    expect(serialized).not.toContain('email');
    expect(serialized).not.toContain('phone');
    expect(serialized).not.toContain('token');
    expect(serialized).not.toContain('CLOUDINARY');
  });
});
