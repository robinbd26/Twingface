import { describe, expect, it } from 'vitest';
import type { TalentProfile } from './talent-browse';
import { prepareTalentProfile } from './talent-profile-view';

const settings = {
  whatsapp: '+8801712345678',
  youtubeUrl: 'https://youtube.com/@amina',
  facebookUrl: null,
  instagramUrl: null,
  tiktokUrl: null,
  websiteUrl: null,
  ratePerDay: 5000,
  ratePerWeek: null,
  ratePerMonth: 90000,
  currency: 'BDT',
  showPhone: false,
  showEmail: false,
  showAddress: false,
  showWhatsapp: false,
  showRates: false,
};

function owner(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'user-1',
    name: 'Amina Rahman',
    username: 'amina',
    profileImage: null,
    coverImage: null,
    bio: 'Cinematographer',
    division: 'Dhaka',
    district: 'Dhaka',
    accountType: 'PROFESSIONAL',
    phone: '01712345678',
    email: 'amina@example.com',
    presentAddress: '12 Road, Dhanmondi',
    professionalIdentities: [],
    organization: null,
    rentalProvider: null,
    talentSettings: settings,
    showcaseItems: [],
    ...overrides,
  } as unknown as TalentProfile;
}

const business = {
  orgName: 'Dhanmondi Films',
  contactName: 'Rina Khan',
  phone: '029876543',
  email: 'studio@dhanmondifilms.example',
  city: 'Dhaka',
};

const rental = {
  id: 'provider-1',
  businessName: 'Lens House',
  ownerName: 'Karim Ahmed',
  phone: '01898765432',
  email: 'hello@lenshouse.example',
  location: 'Dhaka',
};

describe('prepareTalentProfile', () => {
  it('leaves the owner payload untouched so they can manage private values', () => {
    const profile = owner();
    const result = prepareTalentProfile(profile, true);
    expect(result.profile).toBe(profile);
    expect(result.hidden).toEqual({
      phone: false,
      email: false,
      whatsapp: false,
      presentAddress: false,
      rates: false,
    });
  });

  it('strips every private value from a visitor payload instead of only hiding it in the UI', () => {
    const result = prepareTalentProfile(owner(), false);
    expect(result.hidden).toEqual({
      phone: true,
      email: true,
      whatsapp: true,
      presentAddress: true,
      rates: true,
    });
    expect(result.profile.phone).toBeNull();
    expect(result.profile.email).toBeNull();
    expect(result.profile.presentAddress).toBeNull();
    expect(result.profile.talentSettings?.whatsapp).toBeNull();
    expect(result.profile.talentSettings?.ratePerDay).toBeNull();
    expect(result.profile.talentSettings?.ratePerMonth).toBeNull();

    const serialised = JSON.stringify(result.profile);
    for (const secret of ['01712345678', 'amina@example.com', '12 Road', '8801712345678', '5000', '90000']) {
      expect(serialised).not.toContain(secret);
    }
  });

  it('keeps values that the owner marked public', () => {
    const profile = owner({
      talentSettings: { ...settings, showPhone: true, showRates: true },
    });
    const result = prepareTalentProfile(profile, false);
    expect(result.profile.phone).toBe('01712345678');
    expect(result.profile.talentSettings?.ratePerDay).toBe(5000);
    expect(result.hidden.phone).toBe(false);
    expect(result.hidden.rates).toBe(false);
    expect(result.hidden.email).toBe(true);
  });

  it('handles accounts without a settings row using the safe defaults', () => {
    const profile = owner({ talentSettings: null });
    const result = prepareTalentProfile(profile, false);
    expect(result.profile.talentSettings).toBeNull();
    expect(result.hidden.rates).toBe(false);
    expect(result.hidden.phone).toBe(true);
    expect(result.profile.email).toBeNull();
  });

  it('does not flag a field that was never filled in', () => {
    const profile = owner({ email: null });
    const result = prepareTalentProfile(profile, false);
    expect(result.hidden.email).toBe(false);
    expect(result.hidden.presentAddress).toBe(true);
  });

  it('withholds the linked organization and provider contacts under the same switches', () => {
    const result = prepareTalentProfile(owner({ organization: business, rentalProvider: rental }), false);
    expect(result.profile.organization?.orgName).toBe('Dhanmondi Films');
    expect(result.profile.rentalProvider?.businessName).toBe('Lens House');
    expect(result.profile.organization?.phone).toBeNull();
    expect(result.profile.organization?.email).toBeNull();
    expect(result.profile.rentalProvider?.phone).toBeNull();
    expect(result.profile.rentalProvider?.email).toBeNull();

    const serialised = JSON.stringify(result.profile);
    for (const secret of ['029876543', 'studio@dhanmondifilms.example', '01898765432', 'hello@lenshouse.example']) {
      expect(serialised).not.toContain(secret);
    }
  });

  it('publishes organization and provider contacts once the owner shares phone and email', () => {
    const profile = owner({
      organization: business,
      rentalProvider: rental,
      talentSettings: { ...settings, showPhone: true, showEmail: true },
    });
    const result = prepareTalentProfile(profile, false);
    expect(result.profile.organization?.phone).toBe('029876543');
    expect(result.profile.organization?.email).toBe('studio@dhanmondifilms.example');
    expect(result.profile.rentalProvider?.phone).toBe('01898765432');
    expect(result.profile.rentalProvider?.email).toBe('hello@lenshouse.example');
  });

  it('keeps every contact visible for the owner', () => {
    const result = prepareTalentProfile(owner({ organization: business, rentalProvider: rental }), true);
    expect(result.profile.organization?.phone).toBe('029876543');
    expect(result.profile.rentalProvider?.phone).toBe('01898765432');
  });
});
