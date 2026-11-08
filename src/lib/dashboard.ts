import type { SafePost } from '@/lib/post';

export function filterSafePosts(posts: SafePost[], query: string): SafePost[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return posts;
  return posts.filter((post) => `${post.content} ${post.author.name} ${post.author.username}`.toLowerCase().includes(normalized));
}
