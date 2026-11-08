'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AlertBanner,
  ConfirmButton,
  EmptyState,
  INPUT,
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
  mutate,
  type Banner,
} from './admin-ui';

type ReportStatus = 'OPEN' | 'IN_REVIEW' | 'RESOLVED' | 'DISMISSED';

type AdminReport = {
  id: string;
  reason: string;
  details: string | null;
  status: ReportStatus;
  createdAt: string;
  listingId: string;
  listing: { id: string; title: string; isActive: boolean; provider: { id: string; businessName: string | null } };
  reporter: { id: string; name: string; username: string };
};

const STATUS_TEXT: Record<ReportStatus, string> = {
  OPEN: 'Open',
  IN_REVIEW: 'In review',
  RESOLVED: 'Resolved',
  DISMISSED: 'Dismissed',
};

const STATUS_TONE: Record<ReportStatus, 'ok' | 'warn' | 'bad' | 'plain'> = {
  OPEN: 'bad',
  IN_REVIEW: 'warn',
  RESOLVED: 'ok',
  DISMISSED: 'plain',
};

const NEXT_STATUSES: Record<ReportStatus, ReportStatus[]> = {
  OPEN: ['IN_REVIEW', 'RESOLVED', 'DISMISSED'],
  IN_REVIEW: ['RESOLVED', 'DISMISSED'],
  RESOLVED: [],
  DISMISSED: [],
};

export default function AdminReports() {
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [banner, setBanner] = useState<Banner>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'QUEUE' | 'ALL'>('QUEUE');

  const fetchPage = useCallback(
    async (cursor: string | null, append: boolean) => {
      setBanner(null);
      const params = new URLSearchParams({ view, limit: '30' });
      if (cursor) params.set('cursor', cursor);

      const result = await load(`/api/mediaworld/admin/reports?${params.toString()}`, 'Unable to load the report queue.');
      setLoading(false);
      if (!result.ok) {
        setBanner({ tone: 'error', text: result.message });
        return;
      }
      const page = (result.json?.reports ?? []) as AdminReport[];
      setReports((current) => (append ? [...current, ...page] : page));
      setNextCursor((result.json?.nextCursor as string | null) ?? null);
    },
    [view],
  );

  useEffect(() => {
    void fetchPage(null, false);
  }, [fetchPage]);

  async function setStatus(report: AdminReport, status: ReportStatus) {
    setBanner(null);
    const result = await mutate(`/api/mediaworld/admin/reports/${report.id}`, 'PATCH', { status }, 'Unable to update the report status.');
    if (!result.ok) {
      setBanner({ tone: 'error', text: result.message });
      return;
    }
    const updated = result.json?.report as AdminReport | undefined;
    if (!updated) {
      setBanner({ tone: 'error', text: 'The report status could not be confirmed — the server returned no report.' });
      return;
    }
    setReports((current) => current.map((item) => (item.id === updated.id ? { ...item, status: updated.status } : item)));
    setBanner({ tone: 'ok', text: `Report on “${updated.listing.title}” is now ${STATUS_TEXT[updated.status]}.` });
  }

  return (
    <section style={SECTION}>
      <h2 style={TITLE}>Listing reports</h2>
      <p style={NOTE}>
        Reports raised by members against rental listings. A report moves Open → In review → Resolved or Dismissed; resolved and dismissed
        reports are final, and hiding the listing is a separate action in the Rental listings tab.
      </p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        {(['QUEUE', 'ALL'] as const).map((option) => (
          <button key={option} type="button" style={TAB_BUTTON(view === option)} onClick={() => setView(option)}>
            {option === 'QUEUE' ? 'Open & in review' : 'All reports'}
          </button>
        ))}
      </div>

      <AlertBanner banner={banner} />
      {loading ? <p style={MUTED}>Loading reports…</p> : null}
      {!loading && reports.length === 0 ? (
        <EmptyState
          title={view === 'QUEUE' ? 'No open reports.' : 'No reports have been filed yet.'}
          note="Members can report a listing from its detail page."
        />
      ) : null}

      {!loading
        ? reports.map((report) => (
            <div key={report.id} style={ROW}>
              <div style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={STRONG_TEXT}>{report.reason}</span>
                  <Pill tone={STATUS_TONE[report.status]}>{STATUS_TEXT[report.status]}</Pill>
                  <Pill tone={report.listing.isActive ? 'ok' : 'bad'}>{report.listing.isActive ? 'Listing visible' : 'Listing hidden'}</Pill>
                </div>
                <span style={MUTED}>
                  Listing:{' '}
                  <Link href={`/for-rent/${report.listing.id}`} style={{ color: '#bfdbfe' }}>
                    {report.listing.title}
                  </Link>{' '}
                  · provider {report.listing.provider.businessName ?? '—'}
                </span>
                <span style={MUTED}>
                  Reporter: {report.reporter.name} (@{report.reporter.username}) · {formatDate(report.createdAt)}
                </span>
                {report.details ? <p style={{ ...MUTED, margin: 0, whiteSpace: 'pre-wrap' }}>{report.details}</p> : null}
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                {NEXT_STATUSES[report.status].length === 0 ? (
                  <span style={MUTED}>Closed — no further action.</span>
                ) : (
                  NEXT_STATUSES[report.status].map((status) => (
                    <ConfirmButton
                      key={status}
                      label={`Mark ${STATUS_TEXT[status]}`}
                      confirmLabel={`Confirm ${STATUS_TEXT[status]}`}
                      tone={status === 'DISMISSED' ? 'danger' : 'default'}
                      onConfirm={() => setStatus(report, status)}
                    />
                  ))
                )}
              </div>
            </div>
          ))
        : null}

      {!loading && nextCursor ? (
        <button type="button" style={INPUT} onClick={() => void fetchPage(nextCursor, true)}>
          Load more reports
        </button>
      ) : null}
    </section>
  );
}
