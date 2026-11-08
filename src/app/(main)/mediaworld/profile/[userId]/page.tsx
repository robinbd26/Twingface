import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { MEDIA_WORLD_CATEGORY_LABELS, type MediaWorldCategory } from '@/lib/mediaworld';

export const metadata = { title: 'Media Profile - MediaWorld' };

export default async function MediaProfilePage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const user = await getCurrentUser();
  // This page publishes the profile's mailto: and tel: contact links, so it follows the
  // members-only rule used by the other talent surfaces.
  if (!user) redirect('/login');

  const profile = await prisma.mediaProfile.findUnique({
    where: { userId },
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
      status: true,
      createdAt: true,
      user: { select: { id: true, name: true, username: true, profileImage: true } },
    },
  });

  if (!profile) {
    return (
      <div className="app-shell page-enter" data-theme="dark">
        <main className="fb-layout">
          <section className="fb-main">
            <div className="fb-card surface" style={{ maxWidth: 600, margin: '0 auto', textAlign: 'center', padding: 40 }}>
              <h1>Profile Not Found</h1>
              <p style={{ color: '#9aa0a6' }}>This media professional profile does not exist or has not been approved.</p>
            </div>
          </section>
        </main>
      </div>
    );
  }

  const isOwn = user?.id === userId;
  const isAdmin = user?.role === 'SUPER_ADMIN';

  return (
    <div className="app-shell page-enter" data-theme="dark">
      <main className="fb-layout">
        <section className="fb-main">
          <div className="fb-card surface" style={{ maxWidth: 700, margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <h1 style={{ marginBottom: 4 }}>{profile.fullName}</h1>
                <div style={{ color: '#2d88ff', fontWeight: 600 }}>
                  {MEDIA_WORLD_CATEGORY_LABELS[profile.profession as MediaWorldCategory]}
                </div>
                <div style={{ color: '#9aa0a6', fontSize: '0.85rem', marginTop: 4 }}>
                  {profile.district}, {profile.division}
                </div>
              </div>
              {profile.status !== 'APPROVED' && !isOwn && !isAdmin ? (
                <div style={{ color: '#ff6b6b', fontSize: '0.85rem' }}>
                  <strong>Pending approval</strong>
                </div>
              ) : null}
            </div>

            <div style={{ marginBottom: 20 }}>
              <h2 style={{ fontSize: '1rem', marginBottom: 8, color: '#9aa0a6' }}>About</h2>
              <p style={{ lineHeight: 1.6 }}>{profile.bio}</p>
            </div>

            {profile.experience && (
              <div style={{ marginBottom: 20 }}>
                <h2 style={{ fontSize: '1rem', marginBottom: 8, color: '#9aa0a6' }}>Experience</h2>
                <p>{profile.experience}</p>
              </div>
            )}

            {profile.portfolio && (
              <div style={{ marginBottom: 20 }}>
                <h2 style={{ fontSize: '1rem', marginBottom: 8, color: '#9aa0a6' }}>Portfolio</h2>
                <a
                  href={profile.portfolio}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#2d88ff', textDecoration: 'underline' }}
                >
                  {profile.portfolio}
                </a>
              </div>
            )}

            <div style={{ marginBottom: 20, paddingTop: 16, borderTop: '1px solid #3a3b3e' }}>
              <h2 style={{ fontSize: '1rem', marginBottom: 8, color: '#9aa0a6' }}>Contact</h2>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {profile.email && (
                  <a href={`mailto:${profile.email}`} className="fb-btn fb-btn-ghost">
                    Email
                  </a>
                )}
                {profile.phone && (
                  <a href={`tel:${profile.phone}`} className="fb-btn fb-btn-ghost">
                    Call
                  </a>
                )}
              </div>
            </div>

            {isOwn && (
              <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid #3a3b3e' }}>
                <p style={{ color: '#9aa0a6', fontSize: '0.85rem', marginBottom: 8 }}>
                  Status: {profile.status}{' '}
                  {profile.status === 'PENDING' && '(under review by Super Admin)'}
                </p>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
