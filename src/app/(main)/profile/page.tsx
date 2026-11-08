import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { safeProfileSelect } from '@/lib/profile';
import { safePostSelect } from '@/lib/post';
import { safeProfilePhotoSelect } from '@/lib/profile-photos';
import { safeFriendshipSelect } from '@/lib/friendship';
import DashboardNavbar from '@/components/dashboard/dashboard-navbar';
import PostCard from '@/components/posts/post-card';
import CreatePostForm from '@/components/posts/create-post-form';
import { PencilIcon, PlusCircleIcon } from '@/components/dashboard/icons';
import ProfileMediaUploader from '@/components/profile/profile-media-uploader';
import ProfileIntro from './profile-intro';
import ProfilePhotos from './profile-photos';

export const metadata: Metadata = { title: 'Profile - Twingface' };

const tabs = ['Posts', 'About', 'Friends', 'Photos', 'Videos', 'Check-ins', 'More'] as const;

export default async function ProfilePage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect('/login');
  const profile = await prisma.user.findUnique({ where: { id: currentUser.id }, select: safeProfileSelect });
  if (!profile) redirect('/login');
  const [posts, photos, friendshipRows, friendCount] = await Promise.all([
    prisma.post.findMany({ where: { authorId: currentUser.id }, orderBy: { createdAt: 'desc' }, select: safePostSelect }),
    prisma.post.findMany({
      where: { authorId: currentUser.id, imageUrl: { not: null } },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 9,
      select: safeProfilePhotoSelect,
    }),
    prisma.friendship.findMany({ where: { status: 'ACCEPTED', OR: [{ requesterId: currentUser.id }, { recipientId: currentUser.id }] }, orderBy: { updatedAt: 'desc' }, take: 6, select: safeFriendshipSelect }),
    prisma.friendship.count({ where: { status: 'ACCEPTED', OR: [{ requesterId: currentUser.id }, { recipientId: currentUser.id }] } }),
  ]);
  const friends = friendshipRows.map((friendship) => friendship.requesterId === currentUser.id ? friendship.recipient : friendship.requester);
  const initial = profile.name.trim().charAt(0).toUpperCase() || 'T';
  const firstName = profile.name.split(' ')[0] || profile.name;

  return (
    <div className='app-shell page-enter' data-theme='dark'>
      <DashboardNavbar user={{ id: profile.id, name: profile.name, username: profile.username, profileImage: profile.profileImage }} />

      <div className='fb-hero surface'>
        <div className='fb-cover' style={profile.coverImage ? { backgroundImage: `url(${profile.coverImage})` } : undefined}>
          <ProfileMediaUploader kind='cover' className='fb-cover-edit' />
        </div>

        <div className='fb-hero-body'>
          <div className='fb-id-row'>
            <div className='fb-id'>
              <div className='fb-avatar-wrap'>
                {profile.profileImage ? (
                  <img className='fb-avatar' src={profile.profileImage} alt={`${profile.name}'s profile`} />
                ) : (
                  <span className='fb-avatar fb-avatar-fallback' aria-hidden='true'>{initial}</span>
                )}
                <ProfileMediaUploader kind='profile' compact className='fb-avatar-cam' />
              </div>
              <div className='fb-titles'>
                <h1>{profile.name}</h1>
                <p className='fb-friends-count'>{friendCount} {friendCount === 1 ? 'friend' : 'friends'}</p>
              </div>
            </div>

            <div className='fb-actions'>
              <Link className='fb-btn fb-btn-primary' href='/profile/edit'><PlusCircleIcon size={17} /> Add to story</Link>
              <Link className='fb-btn fb-btn-ghost' href='/profile/edit' data-testid='button-edit-profile'><PencilIcon size={16} /> Edit profile</Link>
              <button type='button' className='fb-btn fb-btn-ghost fb-btn-icon' aria-label='More profile actions'>
                <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'><path d='m6 9 6 6 6-6' /></svg>
              </button>
            </div>
          </div>
        </div>

        <div className='fb-tabs' role='tablist' aria-label='Profile sections'>
          {tabs.map((tab, i) => (
            <button key={tab} type='button' role='tab' aria-selected={i === 0} className={`fb-tab${i === 0 ? ' active' : ''}`}>
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className='fb-layout'>
        <aside className='fb-left' aria-label='Profile details'>
          <ProfileIntro profile={profile} />

          <ProfilePhotos photos={photos} username={profile.username} />

          <section className='fb-card surface' aria-label='Friends'>
            <div className='fb-card-head'>
              <div>
                <h2>Friends</h2>
                <p className='fb-friends-count'>{friendCount} {friendCount === 1 ? 'friend' : 'friends'}</p>
              </div>
            </div>
            {friends.length ? (
              <div className='fb-friend-grid'>
                {friends.map((friend) => (
                  <a className='fb-friend' href={`/${friend.username}`} key={friend.id}>
                    {friend.profileImage ? <img className='fb-friend-photo' src={friend.profileImage} alt='' /> : <span className='fb-friend-photo fb-avatar-fallback'>{friend.name.charAt(0).toUpperCase()}</span>}
                    <p>{friend.name}</p>
                  </a>
                ))}
              </div>
            ) : <p className='fb-friend-empty'>No friends yet</p>}
          </section>
        </aside>

        <div className='fb-main' aria-label='Profile feed'>
          <CreatePostForm name={firstName} profileImage={profile.profileImage} variant='profile' />

          <div className='fb-feed-head surface'>
            <h2>Posts</h2>
            <span className='fb-filters'>Filters</span>
          </div>

          {posts.length > 0 ? (
            <div className='fb-feed'>
              {posts.map((post) => <PostCard key={post.id} post={post} viewer={{ id: profile.id, name: profile.name, profileImage: profile.profileImage }} />)}
            </div>
          ) : (
            <div className='empty-feed surface' data-testid='empty-feed'>
              <strong>No posts yet</strong>
              <span>Share your first post from the dashboard.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

