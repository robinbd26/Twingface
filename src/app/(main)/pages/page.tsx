import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { safePageSelect } from '@/lib/page';
import DashboardNavbar from '@/components/dashboard/dashboard-navbar';
import { FlagIcon, PencilIcon, PlusCircleIcon } from '@/components/dashboard/icons';

export const metadata: Metadata = { title: 'Pages - Twingface' };

export default async function PagesPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect('/login');
  const pages = await prisma.page.findMany({ where: { ownerId: currentUser.id }, orderBy: { createdAt: 'desc' }, select: safePageSelect });

  return (
    <div className='app-shell page-enter' data-theme='dark'>
      <DashboardNavbar user={{ id: currentUser.id, name: currentUser.name, username: currentUser.username, profileImage: currentUser.profileImage }} />

      <div className='fb-hero surface pages-hero'>
        <div className='fb-hero-body'>
          <div className='fb-id-row'>
            <div className='fb-id'>
              <span className='rail-icon tone-orange' aria-hidden='true'><FlagIcon size={22} /></span>
              <div className='fb-titles'>
                <h1>Your Pages</h1>
                <p className='fb-friends-count'>{pages.length} {pages.length === 1 ? 'page' : 'pages'} created</p>
              </div>
            </div>
            <div className='fb-actions'>
              <Link className='fb-btn fb-btn-primary' href='/pages/create'><PlusCircleIcon size={17} /> Create Page</Link>
            </div>
          </div>
        </div>
      </div>

      <div className='fb-layout'>
        <div className='fb-main'>
          {pages.length > 0 ? (
            <div className='fb-feed'>
              {pages.map((page) => (
                <section key={page.id} className='fb-card surface' aria-label={`Page ${page.name}`}>
                  <div className='fb-card-head'>
                    <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                      {page.avatarUrl ? (
                        <img className='fb-friend-photo avatar-photo' style={{ width: 52, height: 52, flexShrink: 0 }} src={page.avatarUrl} alt='' />
                      ) : (
                        <span className='fb-friend-photo avatar-mint' style={{ width: 52, height: 52, flexShrink: 0 }} aria-hidden='true'>{page.name.charAt(0).toUpperCase()}</span>
                      )}
                      <div>
                        <h2><Link className='page-card-link' href={`/pages/${page.handle}`}>{page.name}</Link></h2>
                        <p className='fb-friends-count'>@{page.handle} · {page.category}</p>
                      </div>
                    </div>
                    <Link className='fb-btn' href={`/pages/${page.handle}/edit`} aria-label={`Edit ${page.name}`}><PencilIcon size={15} /> Edit</Link>
                  </div>
                  {page.bio ? <p className='fb-bio'>{page.bio}</p> : null}
                </section>
              ))}
            </div>
          ) : (
            <div className='empty-feed surface' data-testid='empty-pages'>
              <strong>No pages yet</strong>
              <span>Create your first page to share updates with your audience.</span>
              <Link className='fb-btn fb-btn-primary' href='/pages/create'><PlusCircleIcon size={17} /> Create Page</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
