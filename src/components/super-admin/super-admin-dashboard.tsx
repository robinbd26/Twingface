'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { formatAdminMetric, type AdminActivity, type SuperAdminDashboardData } from '@/lib/super-admin-dashboard';

type AdminIdentity = { name: string; username: string; profileImage: string | null };

type NavItem = { label: string; href?: string; badge?: string };

const navigation: Array<{ title: string; items: NavItem[] }> = [
  { title: 'Analytics', items: [{ label: 'Dashboard', href: '/super_admin' }, { label: 'Analytics & Reports' }, { label: 'Global Search' }, { label: 'Activity Center' }] },
  { title: 'User Management', items: [{ label: 'Users' }, { label: 'Verification' }, { label: 'Roles & Permissions' }, { label: 'Admin Users' }] },
  { title: 'Social Platform', items: [{ label: 'Posts & Content', href: '/dashboard' }, { label: 'Comments & Reports' }, { label: 'Groups & Pages', href: '/groups' }, { label: 'Friends & Connections', href: '/friends' }] },
  { title: 'Messaging & Communication', items: [{ label: 'Messages & Calls', href: '/messages' }, { label: 'Live Streaming' }] },
  { title: 'Entertainment', items: [{ label: 'OTT Management', href: '/ott' }, { label: 'Games Management', href: '/games' }] },
  { title: 'Business & Marketplace', items: [{ label: 'Media World', href: '/mediaworld' }, { label: 'Media World Admin', href: '/super_admin#media-world-admin' }, { label: 'Marketplace', href: '/marketplace' }, { label: 'Orders & Disputes' }, { label: 'Bookings' }] },
  { title: 'Trust & Safety', items: [{ label: 'Moderation Queue' }, { label: 'Copyright Center' }, { label: 'Support Tickets' }] },
  { title: 'System & Operations', items: [{ label: 'Twingface AI', href: '/ai' }, { label: 'System Health' }, { label: 'Audit Logs' }, { label: 'Global Settings' }] },
];

const quickAccess: Array<{ label: string; icon: string; href?: string; connected: boolean }> = [
  { label: 'Manage Users', icon: '👥', connected: false },
  { label: 'Review Reports', icon: '🚩', connected: false },
  { label: 'OTT Content', icon: '▶', href: '/ott', connected: false },
  { label: 'Marketplace', icon: '🛍', href: '/marketplace', connected: true },
  { label: 'Media Services', icon: '🎬', href: '/mediaworld', connected: true },
  { label: 'Games', icon: '🎮', href: '/games', connected: true },
  { label: 'Transactions', icon: '৳', connected: false },
  { label: 'Support Tickets', icon: '🎧', connected: false },
];

const activityIcon: Record<AdminActivity['type'], string> = { USER: '👤', POST: '📝', LISTING: '🛍', GAME: '🎮', MEDIA_PROFILE: '🎬' };

function relativeTime(value: string, now: number): string {
  const diff = Math.max(0, now - new Date(value).getTime());
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function Avatar({ admin }: { admin: AdminIdentity }) {
  if (admin.profileImage) return <img className="super-admin-avatar" src={admin.profileImage} alt="" />;
  return <span className="super-admin-avatar super-admin-avatar-fallback" aria-hidden="true">{admin.name.slice(0, 1).toUpperCase()}</span>;
}

function LineChart({ data }: { data: SuperAdminDashboardData['growth'] }) {
  const max = Math.max(1, ...data.flatMap((day) => [day.users, day.posts]));
  const points = (key: 'users' | 'posts') => data.map((day, index) => `${(index / Math.max(1, data.length - 1)) * 100},${100 - (day[key] / max) * 88 - 6}`).join(' ');
  return (
    <div className="super-admin-chart" aria-label="30 day user and post growth chart">
      <div className="super-admin-chart-legend"><span><i className="super-admin-dot super-admin-dot-blue" />New users</span><span><i className="super-admin-dot super-admin-dot-violet" />Posts</span></div>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label="Growth trend">
        <line x1="0" y1="25" x2="100" y2="25" /><line x1="0" y1="50" x2="100" y2="50" /><line x1="0" y1="75" x2="100" y2="75" />
        <polyline className="super-admin-line-users" points={points('users')} />
        <polyline className="super-admin-line-posts" points={points('posts')} />
      </svg>
      <div className="super-admin-chart-labels"><span>{data[0]?.date.slice(5) ?? '—'}</span><span>{data.at(-1)?.date.slice(5) ?? '—'}</span></div>
    </div>
  );
}

export default function SuperAdminDashboard({ admin, data, generatedAt }: { admin: AdminIdentity; data: SuperAdminDashboardData; generatedAt: string }) {
  // The reference time comes from the server so the SSR markup and the hydrated tree agree.
  const now = new Date(generatedAt).getTime();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element | null;
      if (dropdownOpen && !target?.closest('.super-admin-account')) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dropdownOpen]);
  const [pendingProfiles, setPendingProfiles] = useState(data.pendingProfiles);
  const [approvalError, setApprovalError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const normalizedQuery = query.trim().toLowerCase();
  const matches = (value: string) => !normalizedQuery || value.toLowerCase().includes(normalizedQuery);
  const filteredUsers = data.recentUsers.filter((user) => matches(`${user.name} ${user.username} ${user.email ?? ''}`));
  const filteredActivities = data.activities.filter((activity) => matches(activity.title));

  async function updateApproval(id: string, action: 'approve' | 'reject') {
    setApprovalError(null);
    setActionId(id);
    try {
      const response = await fetch(`/api/mediaworld/approval/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }) });
      if (!response.ok) throw new Error('The approval could not be updated.');
      setPendingProfiles((profiles) => profiles.filter((profile) => profile.id !== id));
    } catch (error) {
      setApprovalError(error instanceof Error ? error.message : 'The approval could not be updated.');
    } finally {
      setActionId(null);
    }
  }

  const cards = [
    ['👥', 'Total Users', data.metrics.totalUsers, 'blue'],
    ['⚡', 'Active Users (30d)', data.metrics.activeUsers, 'green'],
    ['●', 'Online Now', data.metrics.onlineUsers, 'teal'],
    ['▣', 'Total Posts', data.metrics.totalPosts, 'violet'],
    ['🛍', 'Marketplace Listings', data.metrics.marketplaceListings, 'orange'],
    ['✓', 'Pending Approvals', data.metrics.pendingApprovals, 'pink'],
  ] as const;

  return (
    <div className="super-admin-shell" data-theme="dark">
      <header className="super-admin-topbar">
        <Link href="/super_admin" className="super-admin-brand"><b>T</b><span>TWINGFACE<small>SUPER ADMIN PANEL</small></span></Link>
        <button type="button" className="super-admin-menu-button" aria-label="Toggle admin navigation" aria-expanded={sidebarOpen} onClick={() => setSidebarOpen((open) => !open)}>☰</button>
        <label className="super-admin-search"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search dashboard records..." /></label>
        <div className="super-admin-top-actions"><span className="super-admin-period">Last 30 days</span><span className="super-admin-online"><i />Live</span><div className="super-admin-account">
        <button type="button" className="super-admin-account-btn" aria-label="Account menu" aria-expanded={dropdownOpen} onClick={() => setDropdownOpen((open) => !open)}>
          <Avatar admin={admin} />
          <span><strong>{admin.name}</strong><small>Super Admin</small></span>
        </button>
        {dropdownOpen && (
          <div className="super-admin-dropdown">
            <Link href="/settings" className="super-admin-dropdown-item" onClick={() => setDropdownOpen(false)}>Settings</Link>
            <button type="button" className="super-admin-dropdown-item super-admin-dropdown-logout" onClick={() => { setDropdownOpen(false); fetch('/api/auth/logout', { method: 'POST' }).catch(() => {}); window.location.href = '/login'; }}>Logout</button>
          </div>
        )}
      </div></div>
      </header>

      <div className="super-admin-layout">
        <aside className={`super-admin-sidebar ${sidebarOpen ? 'is-open' : ''}`}>
          <nav aria-label="Super Admin navigation">
            {navigation.map((group) => <section key={group.title} className="super-admin-nav-group"><h2>{group.title}</h2>{group.items.map((item) => item.href ? <Link onClick={() => setSidebarOpen(false)} className={`super-admin-nav-link ${item.label === 'Dashboard' ? 'is-active' : ''}`} href={item.href} key={item.label}>{item.label}<span>›</span></Link> : <button type="button" className="super-admin-nav-link is-disabled" key={item.label} disabled>{item.label}<em>Coming soon</em></button>)}</section>)}
          </nav>
        </aside>

        <main className="super-admin-main">
          <section className="super-admin-heading"><div><p>Platform operations</p><h1>Welcome back, {admin.name}</h1><span>Live overview of the Twingface platform.</span></div><Link href="/mediaworld" className="super-admin-primary-link">Review approvals →</Link></section>
          <section className="super-admin-kpis" aria-label="Platform key metrics">
            {cards.map(([icon, label, value, color]) => <article className={`super-admin-kpi super-admin-kpi-${color}`} key={label}><span className="super-admin-kpi-icon">{icon}</span><div><small>{label}</small><strong>{formatAdminMetric(value)}</strong><em>Live database data</em></div></article>)}
          </section>

          <section className="super-admin-overview-grid">
            <article className="super-admin-panel super-admin-growth"><header><div><h2>Platform Growth Overview</h2><p>New users and posts over the last 30 days</p></div><span>30 days</span></header><LineChart data={data.growth} /></article>
            <article className="super-admin-panel super-admin-usage"><header><h2>Platform Usage by Module</h2></header><div className="super-admin-usage-list">{data.moduleCounts.map((module) => <div key={module.label}><span>{module.label}</span><b>{formatAdminMetric(module.count)}</b></div>)}</div></article>
            <article className="super-admin-panel super-admin-system"><header><h2>System Status</h2></header>{data.systemStatus.map((status) => <div className="super-admin-status-row" key={status.label}><span>{status.label}</span><b className={status.state === 'CONNECTED' ? 'is-connected' : 'is-not-connected'}>{status.detail}</b></div>)}</article>
          </section>

          <section className="super-admin-panel super-admin-quick"><header><h2>Quick Access</h2><p>Connected modules open their current platform view.</p></header><div>{quickAccess.map((item) => item.href && item.connected ? <Link key={item.label} href={item.href} className="super-admin-quick-card"><span>{item.icon}</span><strong>{item.label}</strong><small>Open module →</small></Link> : <div className="super-admin-quick-card is-not-connected" key={item.label}><span>{item.icon}</span><strong>{item.label}</strong><small>Not connected</small></div>)}</div></section>

          <section className="super-admin-bottom-grid">
            <article className="super-admin-panel"><header><h2>Recent Users</h2><span>{filteredUsers.length} shown</span></header><div className="super-admin-list">{filteredUsers.map((user) => <div className="super-admin-user-row" key={user.id}><span className="super-admin-user-initial">{user.name.slice(0, 1).toUpperCase()}</span><div><strong>{user.name}</strong><small>@{user.username}{user.email ? ` · ${user.email}` : ''}</small></div><time>{relativeTime(user.createdAt, now)}</time></div>)}{filteredUsers.length === 0 && <p className="super-admin-empty">No current users match this dashboard search.</p>}</div></article>
            <article className="super-admin-panel"><header><h2>Recent Activities</h2><span>{filteredActivities.length} shown</span></header><div className="super-admin-list">{filteredActivities.map((activity) => <div className="super-admin-activity-row" key={activity.id}><span>{activityIcon[activity.type]}</span><div><strong>{activity.title}</strong><small>{activity.type.replace('_', ' ')}</small></div><time>{relativeTime(activity.createdAt, now)}</time></div>)}{filteredActivities.length === 0 && <p className="super-admin-empty">No current activity matches this dashboard search.</p>}</div></article>
            <article className="super-admin-panel super-admin-approvals"><header><h2>Pending Approvals</h2><span>{pendingProfiles.length} pending</span></header>{approvalError && <p className="super-admin-inline-error" role="alert">{approvalError}</p>}<div className="super-admin-list">{pendingProfiles.map((profile) => <div className="super-admin-approval-row" key={profile.id}><div><strong>{profile.fullName}</strong><small>{profile.profession.replaceAll('_', ' ')} · {profile.district}, {profile.division}</small></div><div><button type="button" disabled={actionId === profile.id} onClick={() => void updateApproval(profile.id, 'approve')}>Approve</button><button type="button" disabled={actionId === profile.id} onClick={() => void updateApproval(profile.id, 'reject')}>Reject</button></div></div>)}{pendingProfiles.length === 0 && <p className="super-admin-empty">No pending Media World applications.</p>}</div></article>
          </section>
        </main>
      </div>
    </div>
  );
}
