import { describe, expect, it } from 'vitest';
import { OrganizationProfileSchema } from './validations';

const base = {
  orgTypeId: 'org-type-1',
  orgName: 'Dhaka Film Works',
  contactName: 'Amina Rahman',
};

describe('OrganizationProfileSchema website', () => {
  it('accepts an http or https website', () => {
    expect(OrganizationProfileSchema.safeParse({ ...base, website: 'https://dhakafilmworks.com' }).success).toBe(true);
    expect(OrganizationProfileSchema.safeParse({ ...base, website: 'http://dhakafilmworks.com' }).success).toBe(true);
  });

  it('rejects scripts disguised as URLs because the value is rendered as an anchor href', () => {
    for (const website of ['javascript:alert(1)', 'data:text/html,<script>alert(1)</script>']) {
      const parsed = OrganizationProfileSchema.safeParse({ ...base, website });
      expect(parsed.success).toBe(false);
      if (!parsed.success) {
        expect(parsed.error.flatten().fieldErrors.website).toEqual(['Enter a website starting with http:// or https://.']);
      }
    }
    expect(OrganizationProfileSchema.safeParse({ ...base, website: '//dhakafilmworks.com' }).success).toBe(false);
  });

  it('treats a blank website as not provided', () => {
    const parsed = OrganizationProfileSchema.safeParse({ ...base, website: '' });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.website).toBeUndefined();
  });
});
