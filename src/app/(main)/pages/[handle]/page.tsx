import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { PAGE_TIMELINE_SIZE, safePagePostSelect, safePageSelect } from '@/lib/page';
import DashboardNavbar from '@/components/dashboard/dashboard-navbar';
import { FlagIcon, GlobeIcon, PencilIcon } from '@/components/dashboard/icons';
import PagePostForm from './page-post-form';

type Props = { params: Promise<{ handle: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle } = await params;
  const page = await prisma.page.findUnique({ where: { handle: handle.toLowerCase() }, select: { name: true } });
  return { title: page ? `${page.name} - Twingface` : 'Page - Twingface' };
}

function formatPagePostTime(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${Math.max(minutes, 1)}m ago`;
  if (minutes < 1_440) return `${Math.floor(minutes / 60)}h ago`;
  return `${Math.floor(minutes / 1_440)}d ago`;
}

export default async function PageDetailPage({ params }: Props) {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect('/login');
  const { handle } = await params;
  const page = await prisma.page.findUnique({ where: { handle: handle.toLowerCase() }, select: safePageSelect });
  if (!page) notFound();
  const posts = await prisma.pagePost.findMany({ where: { pageId: page.id }, take: PAGE_TIMELINE_SIZE, orderBy: { createdAt: 'desc' }, select: safePagePostSelect });
  const isOwner = page.ownerId === currentUser.id;

  return (
    <div className='app-shell page-enter' data-theme='dark'>
      <DashboardNavbar user={{ id: currentUser.id, name: currentUser.name, username: currentUser.username, profileImage: currentUser.profileImage }} />

      <div className='fb-hero surface pages-hero'>
        {page.coverUrl ? <img className='page-cover' src={page.coverUrl} alt='' /> : null}
        <div className='fb-hero-body'>
          <div className='fb-id-row'>
            <div className='fb-id'>
              {page.avatarUrl ? (
                <img className='fb-friend-photo avatar-photo page-avatar' src={page.avatarUrl} alt='' />
              ) : (
                <span className='fb-friend-photo avatar-mint page-avatar' aria-hidden='true'>{page.name.charAt(0).toUpperCase()}</span>
              )}
              <span className='rail-icon tone-orange' aria-hidden='true'><FlagIcon size={22} /></span>
              <div className='fb-titles'>
                <h1>{page.name}</h1>
                <p className='fb-friends-count'>@{page.handle} · {page.category} · Managed by {page.owner.name}</p>
                {page.bio ? <p className='fb-bio'>{page.bio}</p> : null}
              </div>
            </div>
            <div className='fb-actions'>
              {isOwner ? (
                <Link className='fb-btn fb-btn-primary' href={`/pages/${page.handle}/edit`}><PencilIcon size={15} /> Edit Page</Link>
              ) : (
                <span className='fb-friends-count'><GlobeIcon size={14} /> Public page</span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className='fb-layout'>
        <div className='fb-main'>
          {isOwner ? (
            <section className='fb-card surface' aria-label='Create a page post'>
              <PagePostForm pageId={page.id} />
            </section>
          ) : null}

          {posts.length > 0 ? (
            <div className='fb-feed' data-testid='page-timeline'>
              {posts.map((post) => (
                <section key={post.id} className='fb-card surface' aria-label={`Post by ${post.author.name}`}>
                  <div className='fb-card-head'>
                    <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                      <span className='fb-friend-photo avatar-lilac' style={{ width: 44, height: 44, flexShrink: 0 }} aria-hidden='true'>{post.author.name.charAt(0).toUpperCase()}</span>
                      <div>
                        <h2>{post.author.name}</h2>
                        <p className='fb-friends-count'>@{post.author.username} · {formatPagePostTime(post.createdAt)}</p>
                      </div>
                    </div>
                  </div>
                  <p className='fb-bio'>{post.content}</p>
                  {post.imageUrl ? <img className='page-post-image' src={post.imageUrl} alt='' /> : null}
                </section>
              ))}
            </div>
          ) : (
            <div className='empty-feed surface' data-testid='empty-page-timeline'>
              <strong>No posts yet</strong>
              <span>{isOwner ? 'Publish your first update to engage your audience.' : 'This page has not posted anything yet.'}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
