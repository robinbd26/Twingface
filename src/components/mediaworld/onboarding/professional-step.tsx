'use client';

import { useMemo, useState } from 'react';
import { useMediaWorldLanguage } from '@/components/mediaworld/mediaworld-language';
import { MAX_PROFESSIONAL_IDENTITIES } from '@/lib/mediaworld/validations';
import type { IdentityView } from '@/lib/mediaworld/onboarding';
import type { TaxonomySnapshot } from '@/lib/mediaworld/taxonomy';
import { FormAlert } from '@/components/ui/form-field';
import { nodeName } from '@/lib/mediaworld/labels';
import {
  INPUT_CLASS,
  LABEL_STYLE,
  NETWORK_ERROR,
  postJson,
  readError,
} from '@/lib/client/forms';

const SAVE_ERROR = { bn: 'পেশা যোগ করা যায়নি।', en: 'Unable to add that profession.' };
const REMOVE_ERROR = { bn: 'পেশা সরানো যায়নি।', en: 'Unable to remove that profession.' };

export default function ProfessionalStep({
  taxonomy,
  identities,
  onChange,
}: {
  taxonomy: TaxonomySnapshot;
  identities: IdentityView[];
  onChange: (identities: IdentityView[]) => void;
}) {
  const { language } = useMediaWorldLanguage();
  const bn = language === 'bn';

  const [industryId, setIndustryId] = useState(taxonomy.industries[0]?.id ?? '');
  const [categoryId, setCategoryId] = useState('');
  const [designationId, setDesignationId] = useState('');
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);

  const industry = taxonomy.industries.find((item) => item.id === industryId);
  const category = industry?.categories.find((item) => item.id === categoryId);
  const designations = useMemo(() => category?.designations ?? [], [category]);

  const filteredDesignations = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return designations;
    return designations.filter(
      (item) =>
        item.nameEn.toLowerCase().includes(needle)
        || item.nameBn.toLowerCase().includes(needle)
        || item.code.toLowerCase().includes(needle),
    );
  }, [designations, search]);

  const taken = useMemo(
    () => new Set(identities.map((item) => `${item.industry.id}|${item.mainCategory.id}|${item.designation.id}`)),
    [identities],
  );

  const grouped = useMemo(() => {
    const byIndustry = new Map<string, { label: string; categories: Map<string, { label: string; items: IdentityView[] }> }>();
    for (const identity of identities) {
      const industryGroup = byIndustry.get(identity.industry.id)
        ?? { label: nodeName(identity.industry, bn), categories: new Map() };
      const categoryGroup = industryGroup.categories.get(identity.mainCategory.id)
        ?? { label: nodeName(identity.mainCategory, bn), items: [] as IdentityView[] };
      categoryGroup.items.push(identity);
      industryGroup.categories.set(identity.mainCategory.id, categoryGroup);
      byIndustry.set(identity.industry.id, industryGroup);
    }
    return [...byIndustry.values()];
  }, [identities, bn]);

  function chooseIndustry(id: string) {
    setIndustryId(id);
    setCategoryId('');
    setDesignationId('');
    setSearch('');
  }

  function chooseCategory(id: string) {
    setCategoryId(id);
    setDesignationId('');
    setSearch('');
  }

  async function addIdentity() {
    if (!industry || !category || !designationId) return;
    const designation = designations.find((item) => item.id === designationId);
    if (!designation) return;

    setBusy(true);
    setMessage(null);
    const { ok, json } = await postJson('/api/mediaworld/identities', {
      industryId: industry.id,
      mainCategoryId: category.id,
      designationId,
    });
    setBusy(false);

    if (!ok) {
      setMessage({ tone: 'error', text: readError(json, SAVE_ERROR, bn) });
      return;
    }
    const created = (json as { identity?: IdentityView } | null)?.identity;
    if (!created) {
      setMessage({ tone: 'error', text: readError(null, SAVE_ERROR, bn) });
      return;
    }
    onChange([...identities, created]);
    setDesignationId('');
    setSearch('');
    setMessage({ tone: 'ok', text: bn ? 'পেশা যোগ হয়েছে।' : `${nodeName(designation, bn)} added to your profile.` });
  }

  async function removeIdentity(id: string) {
    setBusy(true);
    setMessage(null);
    const response = await fetch(`/api/mediaworld/identities/${id}`, { method: 'DELETE' }).catch(() => null);
    setBusy(false);
    if (!response) {
      setMessage({ tone: 'error', text: bn ? NETWORK_ERROR.bn : NETWORK_ERROR.en });
      return;
    }
    if (!response.ok) {
      const json = await response.json().catch(() => null);
      setMessage({ tone: 'error', text: readError(json, REMOVE_ERROR, bn) });
      return;
    }
    onChange(identities.filter((item) => item.id !== id));
  }

  const atLimit = identities.length >= MAX_PROFESSIONAL_IDENTITIES;
  const duplicate = industry && category && designationId
    ? taken.has(`${industry.id}|${category.id}|${designationId}`)
    : false;

  return (
    <div className='mw-onb-step'>
      <h2>{bn ? 'আপনার পেশা বেছে নিন' : 'Choose your professions'}</h2>
      <p className='mw-onb-lead'>
        {bn
          ? 'ইন্ডাস্ট্রি → মূল ক্যাটাগরি → পদ বেছে নিন। একই প্রোফাইলে একাধিক পেশা যোগ করা যাবে।'
          : 'Pick Industry → Main Category → Designation. You can add several professional identities to one profile.'}
      </p>

      {message ? <FormAlert message={message.text} tone={message.tone} /> : null}

      <div className='mw-onb-picker'>
        <div className='mw-onb-level'>
          <span style={LABEL_STYLE}>{bn ? '১. ইন্ডাস্ট্রি' : '1. Industry'}</span>
          <div className='mw-onb-chips' role='group' aria-label={bn ? 'ইন্ডাস্ট্রি' : 'Industry'}>
            {taxonomy.industries.map((item) => (
              <button
                key={item.id}
                type='button'
                className={`mw-onb-chip${item.id === industryId ? ' active' : ''}`}
                aria-pressed={item.id === industryId}
                onClick={() => chooseIndustry(item.id)}
              >
                {nodeName(item, bn)}
              </button>
            ))}
          </div>
        </div>

        <div className='mw-onb-level'>
          <span style={LABEL_STYLE}>{bn ? '২. মূল ক্যাটাগরি' : '2. Main category'}</span>
          <div className='mw-onb-chips' role='group' aria-label={bn ? 'মূল ক্যাটাগরি' : 'Main category'}>
            {industry?.categories.length
              ? industry.categories.map((item) => (
                <button
                  key={item.id}
                  type='button'
                  className={`mw-onb-chip${item.id === categoryId ? ' active' : ''}`}
                  aria-pressed={item.id === categoryId}
                  onClick={() => chooseCategory(item.id)}
                >
                  {nodeName(item, bn)}
                </button>
              ))
              : <span className='mw-onb-muted'>{bn ? 'এই ইন্ডাস্ট্রিতে ক্যাটাগরি নেই।' : 'No categories in this industry.'}</span>}
          </div>
        </div>

        <div className='mw-onb-level'>
          <label style={LABEL_STYLE} htmlFor='mw-onb-designation-search'>
            {bn ? '৩. পদ / ডিজাইনেশন' : '3. Designation'}
          </label>
          <input
            id='mw-onb-designation-search'
            type='search'
            className={INPUT_CLASS}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={bn ? 'নাম লিখে খুঁজুন…' : 'Search designations…'}
            disabled={!category}
          />
          <div className='mw-onb-options' role='group' aria-label={bn ? 'পদ' : 'Designations'}>
            {category
              ? filteredDesignations.map((item) => (
                <button
                  key={item.id}
                  type='button'
                  className={`mw-onb-option${item.id === designationId ? ' active' : ''}`}
                  aria-pressed={item.id === designationId}
                  disabled={taken.has(`${industry?.id}|${category.id}|${item.id}`)}
                  onClick={() => setDesignationId(item.id)}
                >
                  {nodeName(item, bn)}
                  {taken.has(`${industry?.id}|${category.id}|${item.id}`)
                    ? <span className='mw-onb-option-tag'>{bn ? 'যোগ হয়েছে' : 'Added'}</span>
                    : null}
                </button>
              ))
              : <span className='mw-onb-muted'>{bn ? 'আগে ক্যাটাগরি বেছে নিন।' : 'Choose a category first.'}</span>}
            {category && !filteredDesignations.length ? (
              <span className='mw-onb-muted'>{bn ? 'এই নামে কোনো পদ নেই।' : 'No designation matches that search.'}</span>
            ) : null}
          </div>
        </div>

        <div className='mw-onb-actions'>
          <button
            type='button'
            className='mediaworld-cta-button'
            onClick={addIdentity}
            disabled={busy || !category || !designationId || duplicate || atLimit}
          >
            {identities.length
              ? (bn ? '+ আরও ক্যাটাগরি যোগ করুন' : '+ Add Another Category')
              : (bn ? 'প্রোফাইলে যোগ করুন' : 'Add to profile')}
          </button>
          {atLimit ? (
            <span className='mw-onb-muted'>
              {bn
                ? `এক প্রোফাইলে সর্বোচ্চ ${MAX_PROFESSIONAL_IDENTITIES}টি পেশা রাখা যায়।`
                : `A profile can hold at most ${MAX_PROFESSIONAL_IDENTITIES} identities.`}
            </span>
          ) : duplicate ? (
            <span className='mw-onb-muted'>{bn ? 'এই পদটি আপনার প্রোফাইলে আছে।' : 'That designation is already on your profile.'}</span>
          ) : null}
        </div>
      </div>

      <div className='mw-onb-saved'>
        <h3>{bn ? `আপনার পেশা (${identities.length})` : `Your professions (${identities.length})`}</h3>
        {!identities.length ? (
          <p className='mw-onb-muted'>{bn ? 'এখনো কোনো পেশা যোগ করা হয়নি।' : 'No professions added yet.'}</p>
        ) : (
          <div className='mw-onb-groups'>
            {grouped.map((group) => (
              <section key={group.label} className='mw-onb-group'>
                <h4>{group.label}</h4>
                {group.categories.size
                  ? [...group.categories.values()].map((categoryGroup) => (
                    <div key={categoryGroup.label} className='mw-onb-identity-row'>
                      <span className='mw-onb-identity-category'>{categoryGroup.label}</span>
                      {categoryGroup.items.map((identity) => (
                        <span key={identity.id} className='mw-onb-identity'>
                          <bdi>{nodeName(identity.designation, bn)}</bdi>
                          <button
                            type='button'
                            aria-label={bn ? 'সরান' : 'Remove'}
                            disabled={busy}
                            onClick={() => removeIdentity(identity.id)}
                          >
                            ✕
                          </button>
                        </span>
                      ))}
                    </div>
                  ))
                  : null}
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
