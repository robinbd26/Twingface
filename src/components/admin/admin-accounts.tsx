'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  AlertBanner,
  BTN,
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

type AccountType = 'PROFESSIONAL' | 'BUSINESS' | 'RENTAL';
type ProfileStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

type AdminAccount = {
  id: string;
  name: string;
  username: string;
  email: string | null;
  createdAt: string;
  accountType: AccountType | null;
  _count: { professionalIdentities: number; inquiries: number };
  organization: { id: string; orgName: string } | null;
  rentalProvider: { id: string; businessName: string | null; _count: { listings: number } } | null;
  mediaProfile: { id: string; status: ProfileStatus } | null;
};

const TYPES: AccountType[] = ['PROFESSIONAL', 'BUSINESS', 'RENTAL'];

const TYPE_FILTERS: { value: '' | AccountType; label: string }[] = [
  { value: '', label: 'All Media World accounts' },
  { value: 'PROFESSIONAL', label: 'Professional' },
  { value: 'BUSINESS', label: 'Business' },
  { value: 'RENTAL', label: 'Rental' },
];

export default function AdminAccounts() {
  const [accounts, setAccounts] = useState<AdminAccount[]>([]);
  const [typeTotals, setTypeTotals] = useState<Record<string, number>>({});
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [banner, setBanner] = useState<Banner>(null);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState<'' | AccountType>('');
  const [query, setQuery] = useState('');
  const [appliedQuery, setAppliedQuery] = useState('');

  const fetchPage = useCallback(
    async (cursor: string | null, append: boolean) => {
      setBanner(null);
      const params = new URLSearchParams({ limit: '30' });
      if (type) params.set('type', type);
      if (appliedQuery) params.set('q', appliedQuery);
      if (cursor) params.set('cursor', cursor);

      const result = await load(`/api/mediaworld/admin/accounts?${params.toString()}`, 'Unable to load Media World accounts.');
      setLoading(false);
      if (!result.ok) {
        setBanner({ tone: 'error', text: result.message });
        return;
      }
      const page = (result.json?.accounts ?? []) as AdminAccount[];
      setAccounts((current) => (append ? [...current, ...page] : page));
      setNextCursor((result.json?.nextCursor as string | null) ?? null);
      setTypeTotals((result.json?.typeTotals as Record<string, number>) ?? {});
    },
    [appliedQuery, type],
  );

  useEffect(() => {
    void fetchPage(null, false);
  }, [fetchPage]);

  function replaceAccount(account: AdminAccount) {
    setAccounts((current) => current.map((item) => (item.id === account.id ? account : item)));
  }

  async function correctType(account: AdminAccount, next: AccountType) {
    setBanner(null);
    const result = await mutate(`/api/mediaworld/admin/accounts/${account.id}`, 'PATCH', { accountType: next }, 'Unable to correct the account type.');
    if (!result.ok) {
      setBanner({ tone: 'error', text: result.message });
      return;
    }
    const updated = result.json?.account as AdminAccount | undefined;
    if (!updated) {
      setBanner({ tone: 'error', text: 'The account type change could not be confirmed — the server returned no account.' });
      return;
    }
    replaceAccount(updated);
    setBanner({ tone: 'ok', text: `@${updated.username} is now a ${updated.accountType} account.` });
  }

  async function decideProfile(account: AdminAccount, action: 'approve' | 'reject') {
    setBanner(null);
    if (!account.mediaProfile) return;
    const result = await mutate(`/api/mediaworld/approval/${account.mediaProfile.id}`, 'PATCH', { action }, `Unable to ${action} the legacy media profile.`);
    if (!result.ok) {
      setBanner({ tone: 'error', text: result.message });
      return;
    }
    const status: ProfileStatus = action === 'approve' ? 'APPROVED' : 'REJECTED';
    replaceAccount({ ...account, mediaProfile: { ...account.mediaProfile, status } });
    setBanner({ tone: 'ok', text: `Legacy media profile for @${account.username} was ${action === 'approve' ? 'approved' : 'rejected'}.` });
  }

  return (
    <section style={SECTION}>
      <h2 style={TITLE}>Media World accounts</h2>
      <p style={NOTE}>
        Every account that carries a Media World type, with the records that depend on it. Changing a type here is a data correction, not
        an onboarding shortcut: it is refused when existing industry data, organization profiles or rental listings would become
        inconsistent. Legacy talent profile approval still uses the existing approval endpoint.
      </p>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
        {TYPE_FILTERS.map((filter) => (
          <button key={filter.value || 'ALL'} type="button" style={TAB_BUTTON(type === filter.value)} onClick={() => setType(filter.value)}>
            {filter.label}
            {filter.value ? ` (${typeTotals[filter.value] ?? 0})` : ''}
          </button>
        ))}
        <input style={{ ...INPUT, width: 200 }} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name or username" aria-label="Search accounts" />
        <button type="button" style={BTN} onClick={() => setAppliedQuery(query.trim())}>
          Apply search
        </button>
      </div>

      <AlertBanner banner={banner} />
      {loading ? <p style={MUTED}>Loading accounts…</p> : null}
      {!loading && accounts.length === 0 ? (
        <EmptyState
          title="No Media World accounts match this filter."
          note="Accounts appear here after a member completes Media World onboarding."
        />
      ) : null}

      {!loading
        ? accounts.map((account) => (
            <div key={account.id} style={ROW}>
              <div style={{ flex: '1 1 320px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={STRONG_TEXT}>{account.name}</span>
                  <Pill tone={account.accountType ? 'ok' : 'warn'}>{account.accountType ?? 'No account type'}</Pill>
                  {account.mediaProfile ? (
                    <Pill tone={account.mediaProfile.status === 'APPROVED' ? 'ok' : account.mediaProfile.status === 'PENDING' ? 'warn' : 'bad'}>
                      legacy profile: {account.mediaProfile.status}
                    </Pill>
                  ) : null}
                </div>
                <span style={MUTED}>
                  @{account.username}
                  {account.email ? ` · ${account.email}` : ''} · joined {formatDate(account.createdAt)}
                </span>
                <span style={MUTED}>
                  {account._count.professionalIdentities} professional identit
                  {account._count.professionalIdentities === 1 ? 'y' : 'ies'} ·{' '}
                  {account.organization ? `organization “${account.organization.orgName}”` : 'no organization'} ·{' '}
                  {account.rentalProvider
                    ? `provider “${account.rentalProvider.businessName ?? 'unnamed'}” with ${account.rentalProvider._count.listings} listing(s)`
                    : 'no rental provider'}{' '}
                  · {account._count.inquiries} sent inquir
                  {account._count.inquiries === 1 ? 'y' : 'ies'}
                </span>
              </div>

              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                <TypeCorrector account={account} onCorrect={correctType} />
                {account.mediaProfile?.status === 'PENDING' ? (
                  <>
                    <ConfirmButton label="Approve legacy profile" confirmLabel="Confirm approve" onConfirm={() => decideProfile(account, 'approve')} />
                    <ConfirmButton label="Reject legacy profile" confirmLabel="Confirm reject" tone="danger" onConfirm={() => decideProfile(account, 'reject')} />
                  </>
                ) : null}
              </div>
            </div>
          ))
        : null}

      {!loading && nextCursor ? (
        <button type="button" style={BTN} onClick={() => void fetchPage(nextCursor, true)}>
          Load more accounts
        </button>
      ) : null}
    </section>
  );
}

function TypeCorrector({
  account,
  onCorrect,
}: {
  account: AdminAccount;
  onCorrect: (account: AdminAccount, next: AccountType) => Promise<void>;
}) {
  const [choice, setChoice] = useState<AccountType | ''>('');

  return (
    <>
      <select
        aria-label={`Correct account type for ${account.username}`}
        style={{ ...INPUT, width: 'auto', minWidth: 190 }}
        value={choice}
        onChange={(event) => setChoice(event.target.value as AccountType | '')}
      >
        <option value="">Correct type…</option>
        {TYPES.filter((option) => option !== account.accountType).map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <ConfirmButton
        label="Apply correction"
        confirmLabel="Confirm change"
        disabled={!choice}
        onConfirm={() => {
          if (!choice) return;
          return onCorrect(account, choice).then(() => setChoice(''));
        }}
      />
    </>
  );
}
