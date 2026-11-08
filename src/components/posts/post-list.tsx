'use client';

import { useEffect, useState } from 'react';
import type { SafePost } from '@/lib/post';
import PostCard from './post-card';
import { SparklesIcon } from '../dashboard/icons';

type PostListProps = {
  initialPosts: SafePost[];
  initialNextCursor: string | null;
  viewer: { id: string; name: string; profileImage?: string | null };
};

export default function PostList({ initialPosts, initialNextCursor, viewer }: PostListProps) {
  const [posts, setPosts] = useState(initialPosts);
  const [cursor, setCursor] = useState(initialNextCursor);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setPosts(initialPosts);
    setCursor(initialNextCursor);
  }, [initialNextCursor, initialPosts]);

  async function loadMore() {
    if (!cursor) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/posts?cursor=${encodeURIComponent(cursor)}`);
      if (!response.ok) return;
      const payload = await response.json();
      setPosts((current) => [...current, ...payload.posts]);
      setCursor(payload.nextCursor);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className='feed-list' aria-label='Feed posts'>
      {posts.length > 0 ? (
        posts.map((post) => <PostCard key={post.id} post={post} viewer={viewer} />)
      ) : (
        <div className='empty-feed surface' data-testid='empty-feed'>
          <SparklesIcon size={22} />
          <strong>Your feed starts here</strong>
          <span>Share a little something with your circle.</span>
        </div>
      )}

      {cursor ? (
        <div className='feed-list-tools'>
          <button type='button' onClick={loadMore} disabled={loading} className='feed-more' data-testid='button-load-more'>
            {loading ? 'Loading…' : 'Load more'}
          </button>
        </div>
      ) : null}
    </section>
  );
}
