import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import {
  buildDailySeries,
  buildModuleAvailability,
  buildRecentActivities,
  type AdminActivity,
  type SuperAdminDashboardData,
} from '@/lib/super-admin-dashboard';
import SuperAdminDashboard from '@/components/super-admin/super-admin-dashboard';
import MediaWorldAdmin from '@/components/admin/mediaworld-admin';

export const metadata = { title: 'Super Admin - Twingface' };

export default async function SuperAdminPage() {
  const admin = await getCurrentUser();
  if (!admin) return redirect('/login');
  if (admin.role !== 'SUPER_ADMIN') return redirect('/dashboard');

  const end = new Date();
  const start = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate() - 29));
  const [
    totalUsers,
    presence,
    totalPosts,
    marketplaceListings,
    games,
    pendingApprovals,
    usersInWindow,
    postsInWindow,
    recentUsers,
    recentPosts,
    recentListings,
    recentGames,
    pendingProfiles,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.userPresence.findMany({ select: { isOnline: true, lastActiveAt: true } }),
    prisma.post.count(),
    prisma.marketplaceListing.count(),
    prisma.game.count({ where: { isActive: true } }),
    prisma.mediaProfile.count({ where: { status: 'PENDING' } }),
    prisma.user.findMany({ where: { createdAt: { gte: start } }, select: { createdAt: true } }),
    prisma.post.findMany({ where: { createdAt: { gte: start } }, select: { createdAt: true } }),
    prisma.user.findMany({ orderBy: { createdAt: 'desc' }, take: 5, select: { id: true, name: true, username: true, email: true, profileImage: true, createdAt: true } }),
    prisma.post.findMany({ orderBy: { createdAt: 'desc' }, take: 5, select: { id: true, createdAt: true } }),
    prisma.marketplaceListing.findMany({ orderBy: { createdAt: 'desc' }, take: 5, select: { id: true, title: true, createdAt: true } }),
    prisma.game.findMany({ orderBy: { createdAt: 'desc' }, take: 5, select: { id: true, title: true, createdAt: true } }),
    prisma.mediaProfile.findMany({ where: { status: 'PENDING' }, orderBy: { createdAt: 'desc' }, take: 5, select: { id: true, fullName: true, profession: true, division: true, district: true, createdAt: true } }),
  ]);

  const activeUsers = presence.filter((entry) => entry.lastActiveAt >= start).length;
  const onlineUsers = presence.filter((entry) => entry.isOnline).length;
  const activities: AdminActivity[] = buildRecentActivities([
    ...recentUsers.map((user) => ({ id: `user-${user.id}`, type: 'USER' as const, title: `${user.name} joined Twingface`, createdAt: user.createdAt.toISOString() })),
    ...recentPosts.map((post) => ({ id: `post-${post.id}`, type: 'POST' as const, title: 'A new post was published', createdAt: post.createdAt.toISOString() })),
    ...recentListings.map((listing) => ({ id: `listing-${listing.id}`, type: 'LISTING' as const, title: `${listing.title} was listed in Marketplace`, createdAt: listing.createdAt.toISOString() })),
    ...recentGames.map((game) => ({ id: `game-${game.id}`, type: 'GAME' as const, title: `${game.title} was added to Games`, createdAt: game.createdAt.toISOString() })),
    ...pendingProfiles.map((profile) => ({ id: `profile-${profile.id}`, type: 'MEDIA_PROFILE' as const, title: `${profile.fullName} is awaiting Media World approval`, createdAt: profile.createdAt.toISOString() })),
  ]).slice(0, 8);

  const data: SuperAdminDashboardData = {
    metrics: { totalUsers, activeUsers, onlineUsers, totalPosts, marketplaceListings, games, pendingApprovals },
    growth: buildDailySeries({ end, days: 30, registrations: usersInWindow.map((user) => user.createdAt.toISOString()), posts: postsInWindow.map((post) => post.createdAt.toISOString()) }),
    recentUsers: recentUsers.map((user) => ({ ...user, createdAt: user.createdAt.toISOString() })),
    activities,
    pendingProfiles: pendingProfiles.map((profile) => ({ ...profile, createdAt: profile.createdAt.toISOString() })),
    moduleCounts: [
      { label: 'Social', count: totalPosts },
      { label: 'Marketplace', count: marketplaceListings },
      { label: 'Games', count: games },
      { label: 'Media World', count: pendingApprovals },
    ],
    systemStatus: [buildModuleAvailability('database'), buildModuleAvailability('ott'), buildModuleAvailability('payments'), buildModuleAvailability('streaming'), buildModuleAvailability('support')],
  };

  return (
    <>
      <SuperAdminDashboard admin={{ name: admin.name, username: admin.username, profileImage: admin.profileImage }} data={data} generatedAt={end.toISOString()} />
      <MediaWorldAdmin />
    </>
  );
}
