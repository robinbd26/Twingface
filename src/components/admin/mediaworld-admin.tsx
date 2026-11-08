'use client';

import { useState } from 'react';
import AdminAccounts from './admin-accounts';
import AdminInquiries from './admin-inquiries';
import AdminListings from './admin-listings';
import AdminReports from './admin-reports';
import AdminTaxonomy from './admin-taxonomy';
import { NOTE, TITLE, TAB_BUTTON } from './admin-ui';

const TABS = [
  { key: 'taxonomy', label: 'Taxonomy' },
  { key: 'listings', label: 'Rental listings' },
  { key: 'reports', label: 'Reports' },
  { key: 'inquiries', label: 'Inquiries' },
  { key: 'accounts', label: 'Accounts' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

export default function MediaWorldAdmin() {
  const [tab, setTab] = useState<TabKey>('taxonomy');

  return (
    <section
      id="media-world-admin"
      style={{
        background: '#14161a',
        border: '1px solid #2d2f34',
        borderRadius: 16,
        padding: '20px 22px',
        margin: '0 0 28px',
        color: '#e4e6eb',
      }}
    >
      <h2 style={{ ...TITLE, fontSize: '1.35rem' }}>T-MEDIA HUB operations</h2>
      <p style={NOTE}>
        Media World administration for super admins: the shared taxonomy, the For Rent moderation queue, member reports, the inquiry
        overview and Media World account corrections. Inquiries are the only rental request record on Twingface — this panel neither
        schedules nor confirms a rental.
      </p>

      <div role="tablist" aria-label="Media World admin sections" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
        {TABS.map((item) => (
          <button
            key={item.key}
            role="tab"
            type="button"
            aria-selected={tab === item.key}
            style={TAB_BUTTON(tab === item.key)}
            onClick={() => setTab(item.key)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'taxonomy' ? <AdminTaxonomy /> : null}
      {tab === 'listings' ? <AdminListings /> : null}
      {tab === 'reports' ? <AdminReports /> : null}
      {tab === 'inquiries' ? <AdminInquiries /> : null}
      {tab === 'accounts' ? <AdminAccounts /> : null}
    </section>
  );
}
