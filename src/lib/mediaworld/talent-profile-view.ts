import { DEFAULT_PRIVACY } from './showcase';
import type { TalentProfile } from './talent-browse';

/** Which owner-supplied values were withheld because the owner keeps that field private. */
export type TalentProfileHidden = {
  phone: boolean;
  email: boolean;
  whatsapp: boolean;
  presentAddress: boolean;
  rates: boolean;
};

export const NO_HIDDEN_TALENT_FIELDS: TalentProfileHidden = {
  phone: false,
  email: false,
  whatsapp: false,
  presentAddress: false,
  rates: false,
};

function hasRates(settings: TalentProfile['talentSettings']): boolean {
  if (!settings) return false;
  return settings.ratePerDay != null || settings.ratePerWeek != null || settings.ratePerMonth != null;
}

type Nullable<T, K extends keyof T> = Omit<T, K> & { [P in K]: T[K] | null };

/**
 * What a visitor may receive. The linked organization and rental provider belong to the same
 * account, so their contact columns obey the account's own showPhone/showEmail switches.
 */
export type TalentProfileView = Omit<TalentProfile, 'organization' | 'rentalProvider'> & {
  organization: Nullable<NonNullable<TalentProfile['organization']>, 'phone' | 'email'> | null;
  rentalProvider: Nullable<NonNullable<TalentProfile['rentalProvider']>, 'phone' | 'email'> | null;
};

/**
 * Private values must never reach another visitor's browser, not even inside the RSC payload.
 * The owner keeps every value so the editor and the "Private" badges stay useful.
 */
export function prepareTalentProfile(
  profile: TalentProfile,
  isOwner: boolean,
): { profile: TalentProfileView; hidden: TalentProfileHidden } {
  if (isOwner) return { profile, hidden: NO_HIDDEN_TALENT_FIELDS };

  const settings = profile.talentSettings;
  const privacy = settings ?? DEFAULT_PRIVACY;
  const hidden: TalentProfileHidden = {
    phone: Boolean(profile.phone) && !privacy.showPhone,
    email: Boolean(profile.email) && !privacy.showEmail,
    whatsapp: Boolean(settings?.whatsapp) && !privacy.showWhatsapp,
    presentAddress: Boolean(profile.presentAddress) && !privacy.showAddress,
    rates: hasRates(settings) && !privacy.showRates,
  };
  const organization = profile.organization
    ? {
        ...profile.organization,
        phone: privacy.showPhone ? profile.organization.phone : null,
        email: privacy.showEmail ? profile.organization.email : null,
      }
    : null;
  const provider = profile.rentalProvider
    ? {
        ...profile.rentalProvider,
        phone: privacy.showPhone ? profile.rentalProvider.phone : null,
        email: privacy.showEmail ? profile.rentalProvider.email : null,
      }
    : null;

  return {
    profile: {
      ...profile,
      phone: hidden.phone ? null : profile.phone,
      email: hidden.email ? null : profile.email,
      presentAddress: hidden.presentAddress ? null : profile.presentAddress,
      organization,
      rentalProvider: provider,
      talentSettings: settings
        ? {
            ...settings,
            whatsapp: hidden.whatsapp ? null : settings.whatsapp,
            ratePerDay: hidden.rates ? null : settings.ratePerDay,
            ratePerWeek: hidden.rates ? null : settings.ratePerWeek,
            ratePerMonth: hidden.rates ? null : settings.ratePerMonth,
          }
        : null,
    },
    hidden,
  };
}
