import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { MEDIA_WORLD_CATEGORY_LABELS, type MediaWorldCategory } from '@/lib/mediaworld';

export const metadata = { title: 'Find Talent - MediaWorld' };

export default async function FindTalentPage() {
  const user = await getCurrentUser();
  // Each card renders the professional's phone as a tel: link for recruiters, so the
  // contact data has to stay behind the same members-only gate as the other talent surfaces.
  if (!user) redirect('/login');

  const profiles = await prisma.mediaProfile.findMany({
    where: { status: 'APPROVED' },
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: {
      id: true,
      fullName: true,
      profession: true,
      bio: true,
      division: true,
      district: true,
      phone: true,
      email: true,
      portfolio: true,
      experience: true,
      createdAt: true,
      user: { select: { id: true, name: true, username: true, profileImage: true } },
    },
  });

  return (
    <div className="app-shell page-enter" data-theme="dark">
      <main className="fb-layout">
        <section className="fb-main">
          <div className="fb-card surface" style={{ maxWidth: 900, margin: '0 auto' }}>
            <h1 style={{ marginBottom: 8 }}>Find Media Talent</h1>
            <p style={{ color: '#9aa0a6', marginBottom: 20 }}>
              Browse approved media professionals across Bangladesh — directors, writers, artists, crew, and more.
            </p>

            <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
              <Link href="/mediaworld" className="fb-btn fb-btn-ghost">
                Back to Listings
              </Link>
              {user?.role === 'SUPER_ADMIN' && (
                <Link href="/super_admin" className="fb-btn fb-btn-primary">
                  Admin Dashboard
                </Link>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
              {profiles.map((p) => (
                <div key={p.id} className="fb-card surface" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>{p.fullName}</div>
                    <div style={{ color: '#2d88ff', fontSize: '0.9rem' }}>
                      {MEDIA_WORLD_CATEGORY_LABELS[p.profession as MediaWorldCategory]}
                    </div>
                    <div style={{ color: '#9aa0a6', fontSize: '0.85rem' }}>
                      {p.district}, {p.division}
                    </div>
                  </div>
                  <div style={{ color: '#cbd2d9', fontSize: '0.85rem', lineHeight: 1.4 }}>
                    {p.bio}
                  </div>
                  <div style={{ marginTop: 'auto', display: 'flex', gap: 8 }}>
                    <Link
                      href={`/mediaworld/profile/${p.user.id}`}
                      className="fb-btn fb-btn-ghost"
                      style={{ flex: 1 }}
                    >
                      View Profile
                    </Link>
                    {p.phone && (
                      <a href={`tel:${p.phone}`} className="fb-btn fb-btn-primary" style={{ flex: 1 }}>
                        Call
                      </a>
                    )}
                  </div>
                </div>
              ))}
              {profiles.length === 0 && (
                <div style={{ textAlign: 'center', padding: 40, color: '#9aa0a6' }}>
                  <p>No approved media professionals yet.</p>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
