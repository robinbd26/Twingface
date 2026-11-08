'use client';

import { useState } from 'react';
import type { SafePost } from '@/lib/post';
import { filterSafePosts } from '@/lib/dashboard';
import CreatePostForm from '@/components/posts/create-post-form';
import PostList from '@/components/posts/post-list';
import { GlobeIcon } from './icons';

type DashboardFeedProps = {
  user: { id: string; name: string; username: string; profileImage?: string | null };
  posts: SafePost[];
  nextCursor: string | null;
};

export default function DashboardFeed({ user, posts, nextCursor }: DashboardFeedProps) {
  const [query, setQuery] = useState('');
  const visiblePosts = filterSafePosts(posts, query);

  return (
    <section className='feed-column' aria-label='Social feed'>
      <CreatePostForm name={user.name.split(' ')[0] || user.name} profileImage={user.profileImage} />

      <div className='feed-intro'>
        <span className='eyebrow'>THE LATEST</span>
        <span className='feed-filter'><GlobeIcon size={13} /> Friends&apos; posts</span>
      </div>

      <div className='mb-3 px-1'>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className='w-full rounded-full border border-[var(--line,#e2e7ee)] bg-transparent px-4 py-2 text-[12px] outline-none placeholder:text-slate-400 focus:border-[#3478e4]'
          placeholder='Filter posts by name or text…'
          aria-label='Filter posts'
          data-testid='input-filter-posts'
        />
        {query ? <p className='mt-2 px-1 text-xs text-slate-500'>Posts matching &quot;{query}&quot;</p> : null}
      </div>

      <PostList initialPosts={visiblePosts} initialNextCursor={query ? null : nextCursor} viewer={user} />
    </section>
  );
}

