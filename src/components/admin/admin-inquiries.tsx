'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AlertBanner,
  BTN,
  EmptyState,
  MUTED,
  NOTE,
  Pill,
  ROW,
  SECTION,
  STRONG_TEXT,
  TAB_BUTTON,
  TITLE,
  formatDate,
  load,
  type Banner,
} from './admin-ui';

type InquiryStatus = 'PENDING' | 'REPLIED' | 'ARCHIVED';

type AdminInquiry = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  message: string;
  status: InquiryStatus;
  createdAt: string;
  listing: { id: string; title: string; isActive: boolean; provider: { id: string; businessName: string | null; ownerName: string } };
  user: { id: string; name: string; username: string };
};

const STATUS_TONE: Record<InquiryStatus, 'ok' | 'warn' | 'plain'> = {
  PENDING: 'warn',
  REPLIED: 'ok',
  ARCHIVED: 'plain',
};

const STATUS_FILTERS: { value: '' | InquiryStatus; label: string }[] = [
  { value: '', label: 'All statuses' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'REPLIED', label: 'Replied' },
  { value: 'ARCHIVED', label: 'Archived' },
];

export default function AdminInquiries() {
  const [inquiries, setInquiries] = useState<AdminInquiry[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [banner, setBanner] = useState<Banner>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<'' | InquiryStatus>('');

  const fetchPage = useCallback(
    async (cursor: string | null, append: boolean) => {
      setBanner(null);
      const params = new URLSearchParams({ limit: '30' });
      if (status) params.set('status', status);
      if (cursor) params.set('cursor', cursor);

      const result = await load(`/api/mediaworld/admin/inquiries?${params.toString()}`, 'Unable to load inquiries.');
      setLoading(false);
      if (!result.ok) {
        setBanner({ tone: 'error', text: result.message });
        return;
      }
      const page = (result.json?.inquiries ?? []) as AdminInquiry[];
      setInquiries((current) => (append ? [...current, ...page] : page));
      setNextCursor((result.json?.nextCursor as string | null) ?? null);
    },
    [status],
  );

  useEffect(() => {
    void fetchPage(null, false);
  }, [fetchPage]);

  return (
    <section style={SECTION}>
      <h2 style={TITLE}>Inquiries</h2>
      <p style={NOTE}>
        Read-only overview of the messages members send to rental providers. Statuses belong to the provider who received them, so nothing
        is changed here. An inquiry is the only rental request record Twingface keeps — this panel does not schedule or confirm a rental.
      </p>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        {STATUS_FILTERS.map((filter) => (
          <button key={filter.value || 'ALL'} type="button" style={TAB_BUTTON(status === filter.value)} onClick={() => setStatus(filter.value)}>
            {filter.label}
          </button>
        ))}
      </div>

      <AlertBanner banner={banner} />
      {loading ? <p style={MUTED}>Loading inquiries…</p> : null}
      {!loading && inquiries.length === 0 ? (
        <EmptyState title="No inquiries match this filter." note="Inquiries appear once members contact a listing." />
      ) : null}

      {!loading
        ? inquiries.map((inquiry) => (
            <div key={inquiry.id} style={ROW}>
              <div style={{ flex: '1 1 320px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={STRONG_TEXT}>{inquiry.name}</span>
                  <Pill tone={STATUS_TONE[inquiry.status]}>{inquiry.status}</Pill>
                  <Pill tone={inquiry.listing.isActive ? 'ok' : 'bad'}>{inquiry.listing.isActive ? 'Listing visible' : 'Listing hidden'}</Pill>
                </div>
                <span style={MUTED}>
                  Sender account:{' '}
                  <Link href={`/${inquiry.user.username}`} style={{ color: '#bfdbfe' }}>
                    @{inquiry.user.username}
                  </Link>{' '}
                  · {inquiry.email}
                  {inquiry.phone ? ` · ${inquiry.phone}` : ''}
                </span>
                <span style={MUTED}>
                  Listing:{' '}
                  <Link href={`/for-rent/${inquiry.listing.id}`} style={{ color: '#bfdbfe' }}>
                    {inquiry.listing.title}
                  </Link>{' '}
                  · provider {inquiry.listing.provider.businessName ?? inquiry.listing.provider.ownerName} · {formatDate(inquiry.createdAt)}
                </span>
                <p style={{ ...MUTED, margin: 0, whiteSpace: 'pre-wrap' }}>{inquiry.message}</p>
              </div>
            </div>
          ))
        : null}

      {!loading && nextCursor ? (
        <button type="button" style={{ ...BTN, width: 'auto' }} onClick={() => void fetchPage(nextCursor, true)}>
          Load more inquiries
        </button>
      ) : null}
    </section>
  );
}
