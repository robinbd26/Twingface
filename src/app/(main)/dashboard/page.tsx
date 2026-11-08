import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { DEFAULT_POSTS_PER_PAGE, safePostSelect } from '@/lib/post';
import DashboardFeed from '@/components/dashboard/dashboard-feed';
import DashboardSidebar from '@/components/dashboard/dashboard-sidebar';
import DashboardRightRail from '@/components/dashboard/dashboard-right-rail';
import MobileNav from '@/components/layout/mobile-nav';
import DashboardNavbar from '@/components/dashboard/dashboard-navbar';
export const metadata: Metadata={title:'Home - Twingface'};
export default async function DashboardPage(){const user=await getCurrentUser();if(!user)redirect('/login');const rows=await prisma.post.findMany({take:DEFAULT_POSTS_PER_PAGE+1,orderBy:{createdAt:'desc'},select:safePostSelect});const more=rows.length>DEFAULT_POSTS_PER_PAGE,posts=more?rows.slice(0,DEFAULT_POSTS_PER_PAGE):rows;return <div className='app-shell page-enter' data-theme='light'><DashboardNavbar user={user}/><div className='dashboard-grid'><DashboardSidebar user={user}/><DashboardFeed user={user} posts={posts} nextCursor={more?posts.at(-1)?.id??null:null}/><DashboardRightRail/></div><MobileNav/></div>}
