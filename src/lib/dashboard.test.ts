import { describe, expect, it } from 'vitest';
import { filterSafePosts } from './dashboard';

const posts = [{ id: 'p1', content: 'Hello Dhaka', imageUrl: null, feelingActivity: null, youtubeUrl: null, _count: { comments: 0 }, authorId: 'u1', createdAt: new Date(), updatedAt: new Date(), author: { id: 'u1', name: 'Robin Mondol', username: 'robin', profileImage: null } }];

describe('filterSafePosts', () => {
  it('filters safe post fields without calling an API', () => {
    expect(filterSafePosts(posts, 'ROBIN')).toHaveLength(1);
    expect(filterSafePosts(posts, 'missing')).toHaveLength(0);
  });
});
