import { notFound, redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { safeFriendshipSelect } from '@/lib/friendship';
import { safePostSelect } from '@/lib/post';
import { safeProfilePhotoSelect } from '@/lib/profile-photos';
import { safeProfileSelect } from '@/lib/profile';
import { getRelationshipState, makePairKey } from '@/lib/relationship';
import DashboardNavbar from '@/components/dashboard/dashboard-navbar';
import PublicProfileActions from '@/components/profile/public-profile-actions';
import PostCard from '@/components/posts/post-card';
import ProfilePhotos from '../profile/profile-photos';

const tabs = ['Posts', 'About', 'Friends', 'Photos', 'Videos', 'Check-ins', 'More'] as const;

export default async function PublicProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const profile = await prisma.user.findUnique({ where: { username: username.toLowerCase() }, select: safeProfileSelect });
  if (!profile) notFound();
  const viewer = await getCurrentUser();
  if (viewer?.id === profile.id) redirect('/profile');
  const relationship = viewer ? await prisma.friendship.findUnique({ where: { pairKey: makePairKey(viewer.id, profile.id) }, select: { id: true, requesterId: true, recipientId: true, status: true } }) : null;
  const relationshipState = viewer ? getRelationshipState(viewer.id, relationship) : 'NONE';
  const [posts, photos, friendshipRows, friendCount] = await Promise.all([
    prisma.post.findMany({ where: { authorId: profile.id }, orderBy: { createdAt: 'desc' }, select: safePostSelect }),
    prisma.post.findMany({ where: { authorId: profile.id, imageUrl: { not: null } }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 9, select: safeProfilePhotoSelect }),
    prisma.friendship.findMany({ where: { status: 'ACCEPTED', OR: [{ requesterId: profile.id }, { recipientId: profile.id }] }, orderBy: { updatedAt: 'desc' }, take: 6, select: safeFriendshipSelect }),
    prisma.friendship.count({ where: { status: 'ACCEPTED', OR: [{ requesterId: profile.id }, { recipientId: profile.id }] } }),
  ]);
  const friends = friendshipRows.map((friendship) => friendship.requesterId === profile.id ? friendship.recipient : friendship.requester);
  const initial = profile.name.trim().charAt(0).toUpperCase() || 'T';

  return <div className='app-shell page-enter' data-theme='dark'>
    <DashboardNavbar user={{ id: viewer?.id, name: viewer?.name ?? profile.name, username: viewer?.username ?? profile.username, profileImage: viewer?.profileImage }} />
    <div className='fb-hero surface public-profile-hero'>
      <div className='fb-cover' style={profile.coverImage ? { backgroundImage: `url(${profile.coverImage})` } : undefined} />
      <div className='fb-hero-body'><div className='fb-id-row'>
        <div className='fb-id'><div className='fb-avatar-wrap'>{profile.profileImage ? <img className='fb-avatar' src={profile.profileImage} alt={`${profile.name}'s profile`} /> : <span className='fb-avatar fb-avatar-fallback' aria-hidden='true'>{initial}</span>}</div><div className='fb-titles'><h1>{profile.name}</h1><p className='fb-friends-count'>{friendCount} {friendCount === 1 ? 'friend' : 'friends'}</p></div></div>
        <PublicProfileActions username={profile.username} profileId={profile.id} profileName={profile.name} profileImage={profile.profileImage ?? null} relationship={relationshipState} friendshipId={relationship?.id ?? null} isSignedIn={Boolean(viewer)} />
      </div></div>
      <div className='fb-tabs' role='tablist' aria-label='Profile sections'>{tabs.map((tab, index) => <button key={tab} type='button' role='tab' aria-selected={index === 0} className={`fb-tab${index === 0 ? ' active' : ''}`}>{tab}</button>)}</div>
    </div>
    <div className='fb-layout'>
      <aside className='fb-left' aria-label='Profile details'>
        <section className='fb-card surface fb-intro'><h2 className='fb-card-title'>Intro</h2><p className='fb-bio'>{profile.bio || 'No bio yet.'}</p><ul className='fb-intro-list'>
          {profile.profession ? <li><span className='fb-detail-ico' aria-hidden='true'>💼</span><span>Works as <strong>{profile.profession}</strong></span></li> : null}
          {profile.education ? <li><span className='fb-detail-ico' aria-hidden='true'>🎓</span><span>Studied at <strong>{profile.education}</strong></span></li> : null}
          {profile.currentCity ? <li><span className='fb-detail-ico' aria-hidden='true'>⌂</span><span>Lives in <strong>{profile.currentCity}</strong></span></li> : null}
          {profile.hometown ? <li><span className='fb-detail-ico' aria-hidden='true'>⌖</span><span>From <strong>{profile.hometown}</strong></span></li> : null}
        </ul></section>
        <ProfilePhotos photos={photos} username={profile.username} />
        <section className='fb-card surface' aria-label='Friends'><div className='fb-card-head'><div><h2>Friends</h2><p className='fb-friends-count'>{friendCount} {friendCount === 1 ? 'friend' : 'friends'}</p></div></div>
          {friends.length ? <div className='fb-friend-grid'>{friends.map((friend) => <a className='fb-friend' href={`/${friend.username}`} key={friend.id}>{friend.profileImage ? <img className='fb-friend-photo' src={friend.profileImage} alt='' /> : <span className='fb-friend-photo fb-avatar-fallback'>{friend.name.charAt(0).toUpperCase()}</span>}<p>{friend.name}</p></a>)}</div> : <p className='fb-friend-empty'>No friends yet</p>}
        </section>
      </aside>
      <main className='fb-main' aria-label={`${profile.name}'s posts`}><div className='fb-feed-head surface'><h2>Posts</h2></div>{posts.length ? <div className='fb-feed'>{posts.map((post) => <PostCard key={post.id} post={post} viewer={viewer ? { id: viewer.id, name: viewer.name, profileImage: viewer.profileImage } : undefined} />)}</div> : <div className='empty-feed surface'><strong>No posts yet</strong><span>{profile.name} has not shared a post yet.</span></div>}</main>
    </div>
  </div>;
}
