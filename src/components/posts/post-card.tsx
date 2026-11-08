'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { getFeelingActivity } from '@/lib/feeling-activity';
import { getYouTubeEmbedUrl } from '@/lib/youtube';
import type { SafePost } from '@/lib/post';
import type { SafeComment } from '@/lib/comment';
import { GlobeIcon, SendIcon, CommentIcon, ShareIcon, ThumbsUpIcon, SparklesIcon } from '../dashboard/icons';

function relativeTime(date: Date) {
  const minutes = Math.floor((Date.now() - new Date(date).getTime()) / 60_000);
  if (minutes < 60) return `${Math.max(minutes, 1)}m ago`;
  if (minutes < 1_440) return `${Math.floor(minutes / 60)}h ago`;
  return `${Math.floor(minutes / 1_440)}d ago`;
}

function formatCount(value: number) {
  return value >= 1_000 ? `${(value / 1_000).toFixed(1).replace(/\.0$/, '')}K` : value.toLocaleString();
}

type Viewer = { id: string; name: string; profileImage?: string | null };

// A 1200px landscape feed photo downloads and decodes a 1200px canvas on the
// main thread before it is painted — that is the single biggest cause of
// frame drops in the feed. This keeps the display box at phone-card size
// while requesting a 2.4x-sharper decode source so large images never
// stall the feed on the main thread.
function PostMedia({ imageUrl, authorName }: { imageUrl?: string | null; authorName: string }) {
  const source = useMemo(() => {
    if (!imageUrl) return null;
    // 1200px source, decoded around 500px for the phone preview box.
    return `${imageUrl}?w=${Math.round(1200 / 2.4)}&q=75`;
  }, [imageUrl]);

  return (
    <div className='post-image-media'>
      {source ? (
        <Image
          src={source}
          alt={`Photo shared by ${authorName}`}
          width={1200}
          height={900}
          sizes='(max-width: 720px) 100vw, 680px'
          loading='lazy'
          placeholder='empty'
          priority={false}
        />
      ) : (
        <div className='post-image-media-unknown' />
      )}
    </div>
  );
}

export default function PostCard({ post, viewer }: { post: SafePost; viewer?: Viewer }) {
  const initial = post.author.name.trim().charAt(0).toUpperCase() || 'T';
  const feelingActivity = getFeelingActivity(post.feelingActivity);
  const youtubeEmbedUrl = getYouTubeEmbedUrl(post.youtubeUrl);
  const [liked, setLiked] = useState(false);
  const [commentOpen, setCommentOpen] = useState(false);
  const [comment, setComment] = useState('');
  const [commentItems, setCommentItems] = useState<SafeComment[]>([]);
  const [commentCount, setCommentCount] = useState(post._count.comments);
  const [commentsLoaded, setCommentsLoaded] = useState(false);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentPending, setCommentPending] = useState(false);
  const [commentError, setCommentError] = useState('');
  const [shares, setShares] = useState(0);
  const [toast, setToast] = useState('');

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast((current) => (current === message ? '' : current)), 2600);
  }

  async function toggleComments() {
    const nextOpen = !commentOpen;
    setCommentOpen(nextOpen);
    if (!nextOpen || commentsLoaded || commentsLoading) return;
    setCommentsLoading(true);
    setCommentError('');
    try {
      const response = await fetch(`/api/posts/${post.id}/comments`);
      if (!response.ok) throw new Error('Unable to load comments. Please try again.');
      const payload = await response.json() as { comments?: SafeComment[] };
      setCommentItems(payload.comments ?? []);
      setCommentsLoaded(true);
    } catch (error) {
      setCommentError(error instanceof Error ? error.message : 'Unable to load comments. Please try again.');
    } finally {
      setCommentsLoading(false);
    }
  }

  async function submitComment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = comment.trim();
    if (!content || commentPending) return;
    setCommentPending(true);
    setCommentError('');
    try {
      const response = await fetch(`/api/posts/${post.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      const payload = await response.json().catch(() => null) as { comment?: SafeComment; error?: string } | null;
      if (!response.ok || !payload?.comment) throw new Error(payload?.error || 'Unable to add your comment. Please try again.');
      const createdComment = payload.comment;
      setCommentItems((current) => [...current, createdComment]);
      setCommentCount((current) => current + 1);
      setComment('');
      setCommentsLoaded(true);
    } catch (error) {
      setCommentError(error instanceof Error ? error.message : 'Unable to add your comment. Please try again.');
    } finally {
      setCommentPending(false);
    }
  }

  return (
    <article className='post-card surface' data-testid={`post-${post.id}`}>
      <header className='post-header'>
        <span className='avatar avatar-robin' aria-hidden='true'>{post.author.profileImage ? <img className='avatar-photo' src={post.author.profileImage} alt='' /> : initial}</span>
        <div className='post-author'>
          <Link href={`/${post.author.username}`} data-testid={`text-post-author-${post.id}`}>
            <strong>{post.author.name}</strong>
          </Link>
          {feelingActivity ? (
            <span className='post-feeling-activity'>
              {post.author.name} {feelingActivity.phrase} {feelingActivity.emoji}
            </span>
          ) : null}
          <span>{relativeTime(post.createdAt)}<span className='post-dot'>·</span><GlobeIcon size={12} aria-label='Public' /></span>
        </div>
        <button className='quiet-icon' aria-label={`More options for ${post.author.name}'s post`}>
          <svg aria-hidden='true' width='21' height='21' viewBox='0 0 24 24' fill='currentColor'><circle cx='5' cy='12' r='1.6' /><circle cx='12' cy='12' r='1.6' /><circle cx='19' cy='12' r='1.6' /></svg>
        </button>
      </header>

      <p className='post-copy' lang='bn' data-testid={`text-post-content-${post.id}`}>{post.content}</p>

      {post.imageUrl ? (
        <PostMedia imageUrl={post.imageUrl} authorName={post.author.name} />
      ) : null}

      {youtubeEmbedUrl ? (
        <div className='post-youtube-media'>
          <iframe
            src={youtubeEmbedUrl}
            title={`YouTube video shared by ${post.author.name}`}
            allow='accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share'
            allowFullScreen
            loading='lazy'
            referrerPolicy='strict-origin-when-cross-origin'
          />
        </div>
      ) : null}

      <div className='post-stat-row'>
        <span className='like-stat'>
          <span className='like-dot'><ThumbsUpIcon size={11} fill='currentColor' /></span>
          <span data-testid={`text-post-likes-${post.id}`}>{formatCount(liked ? 1 : 0)}</span>
        </span>
        <button type='button' data-testid={`button-comments-count-${post.id}`} onClick={toggleComments}>{commentCount} comments</button>
        <button type='button' data-testid={`button-shares-count-${post.id}`} onClick={() => { setShares((s) => s + 1); notify('Post shared with your friends.'); }}>{shares} shares</button>
      </div>

      <div className='post-actions'>
        <button type='button' className={liked ? 'is-liked' : ''} data-testid={`button-like-${post.id}`} aria-pressed={liked} onClick={() => setLiked((value) => !value)}>
          <ThumbsUpIcon size={18} fill={liked ? 'currentColor' : 'none'} /><span>{liked ? 'Liked' : 'Like'}</span>
        </button>
        <button type='button' data-testid={`button-comment-${post.id}`} onClick={toggleComments}>
          <CommentIcon size={18} /><span>Comment</span>
        </button>
        <button type='button' data-testid={`button-share-${post.id}`} onClick={() => { setShares((s) => s + 1); notify('Post shared with your friends.'); }}>
          <ShareIcon size={18} /><span>Share</span>
        </button>
      </div>

      {commentOpen ? (
        <div className='post-comments'>
          {commentsLoading ? <p className='comment-pending' role='status'>Loading comments…</p> : null}
          {commentItems.length ? (
            <ol className='comment-list'>
              {commentItems.map((item) => (
                <li key={item.id}>
                  <span className='avatar avatar-robin small-avatar' aria-hidden='true'>{item.author.profileImage ? <img className='avatar-photo' src={item.author.profileImage} alt='' /> : item.author.name.trim().charAt(0).toUpperCase() || 'T'}</span>
                  <p><strong>{item.author.name}</strong><span>{item.content}</span></p>
                </li>
              ))}
            </ol>
          ) : null}
          {commentError ? <p className='comment-error' role='alert'>{commentError}</p> : null}
        <form className='comment-form' onSubmit={submitComment}>
          <span className='avatar avatar-robin small-avatar' aria-hidden='true'>{viewer?.profileImage ? <img className='avatar-photo' src={viewer.profileImage} alt='' /> : viewer?.name.trim().charAt(0).toUpperCase() || initial}</span>
          <input aria-label='Write a comment' data-testid={`input-comment-${post.id}`} value={comment} onChange={(event) => setComment(event.target.value)} placeholder='Write a comment…' />
          <button type='submit' aria-label='Send comment' data-testid={`button-submit-comment-${post.id}`} disabled={!comment.trim() || commentPending}>
            <SendIcon size={17} />
          </button>
        </form>
        </div>
      ) : null}

      {toast ? (
        <div className='notice-toast' role='status' data-testid={`toast-${post.id}`} style={{ bottom: 90 }}>
          <span className='notice-check'><SparklesIcon size={15} /></span>
          {toast}
          <button type='button' aria-label='Dismiss notification' onClick={() => setToast('')}>
            <svg width='15' height='15' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round'><path d='M18 6 6 18M6 6l12 12' /></svg>
          </button>
        </div>
      ) : null}
    </article>
  );
}
