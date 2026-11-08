import type { MediaAccountType } from '@prisma/client';
import { prisma } from '@/lib/db';

export type TaxonomyNodeView = { id: string; code: string; nameEn: string; nameBn: string };

export type IdentityView = {
  id: string;
  industry: TaxonomyNodeView;
  mainCategory: TaxonomyNodeView & { industryId: string };
  designation: TaxonomyNodeView;
};

export type OrganizationView = {
  id: string;
  orgTypeId: string;
  orgName: string;
  contactName: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  description: string | null;
  website: string | null;
  logoUrl: string | null;
  orgType: TaxonomyNodeView;
};

export type ProviderView = {
  id: string;
  ownerName: string;
  businessName: string | null;
  phone: string;
  email: string | null;
  location: string;
  fullAddress: string | null;
  description: string;
  logoUrl: string | null;
};

export type OnboardingState = {
  accountType: MediaAccountType | null;
  identities: IdentityView[];
  organization: OrganizationView | null;
  provider: ProviderView | null;
};

const nodeSelect = { id: true, code: true, nameEn: true, nameBn: true } as const;

export async function loadOnboardingState(userId: string): Promise<OnboardingState> {
  const [account, identities, organization, provider] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { accountType: true } }),
    prisma.userProfessionalIdentity.findMany({
      where: { userId },
      orderBy: [{ industry: { sortOrder: 'asc' } }, { mainCategory: { sortOrder: 'asc' } }, { createdAt: 'asc' }],
      select: {
        id: true,
        industry: { select: nodeSelect },
        mainCategory: { select: { ...nodeSelect, industryId: true } },
        designation: { select: nodeSelect },
      },
    }),
    prisma.organization.findUnique({
      where: { userId },
      select: {
        id: true,
        orgTypeId: true,
        orgName: true,
        contactName: true,
        phone: true,
        email: true,
        address: true,
        city: true,
        description: true,
        website: true,
        logoUrl: true,
        orgType: { select: nodeSelect },
      },
    }),
    prisma.rentalProvider.findUnique({
      where: { userId },
      select: {
        id: true,
        ownerName: true,
        businessName: true,
        phone: true,
        email: true,
        location: true,
        fullAddress: true,
        description: true,
        logoUrl: true,
      },
    }),
  ]);

  return {
    accountType: account?.accountType ?? null,
    identities: identities.map((identity) => ({
      id: identity.id,
      industry: identity.industry,
      mainCategory: identity.mainCategory,
      designation: identity.designation,
    })),
    organization,
    provider,
  };
}
