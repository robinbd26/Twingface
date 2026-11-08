import { describe, expect, it } from 'vitest';
import {
  canReveal,
  DEFAULT_PRIVACY,
  formatRate,
  MAX_SHOWCASE_TITLE,
  MAX_TALENT_RATE,
  normaliseSocialUrl,
  normaliseWhatsapp,
  ShowcaseUpdateSchema,
  ShowcaseVideoSchema,
  showcaseVideoEmbed,
  showcaseVideoHost,
  showcaseVideoThumbnail,
  TalentProfileDetailsSchema,
  TalentSettingsSchema,
} from './showcase';

const settings = {
  whatsapp: '',
  youtubeUrl: '',
  facebookUrl: '',
  instagramUrl: '',
  tiktokUrl: '',
  websiteUrl: '',
  ratePerDay: null,
  ratePerWeek: null,
  ratePerMonth: null,
  showPhone: false,
  showEmail: false,
  showAddress: false,
  showWhatsapp: false,
  showRates: true,
};

describe('TalentSettingsSchema', () => {
  it('accepts blank optional values and whole-number rates', () => {
    expect(TalentSettingsSchema.safeParse(settings).success).toBe(true);
    expect(TalentSettingsSchema.safeParse({ ...settings, ratePerDay: 0, ratePerWeek: 15000 }).success).toBe(true);
  });

  it('rejects script, data and credential-bearing links because they render as anchors', () => {
    for (const url of ['javascript:alert(1)', 'data:text/html,<script>alert(1)</script>', 'https://user:pass@example.com']) {
      const parsed = TalentSettingsSchema.safeParse({ ...settings, websiteUrl: url });
      expect(parsed.success).toBe(false);
    }
  });

  it('accepts local and international WhatsApp formats and rejects other numbers', () => {
    for (const whatsapp of ['01712345678', '+8801712345678', '880 1712-345678']) {
      expect(TalentSettingsSchema.safeParse({ ...settings, whatsapp }).success).toBe(true);
    }
    for (const whatsapp of ['01212345678', '12345', '+15551234567']) {
      expect(TalentSettingsSchema.safeParse({ ...settings, whatsapp }).success).toBe(false);
    }
  });

  it('rejects negative, fractional and oversized rates', () => {
    for (const ratePerDay of [-1, 1.5, MAX_TALENT_RATE + 1]) {
      expect(TalentSettingsSchema.safeParse({ ...settings, ratePerDay }).success).toBe(false);
    }
  });

  it('rejects unknown settings keys instead of silently dropping them', () => {
    expect(TalentSettingsSchema.safeParse({ ...settings, isAdmin: true }).success).toBe(false);
  });
});

describe('TalentProfileDetailsSchema', () => {
  const details = { bio: '', division: '', district: '', presentAddress: '' };

  it('requires a division when a district is picked', () => {
    const parsed = TalentProfileDetailsSchema.safeParse({ ...details, district: 'Dhaka' });
    expect(parsed.success).toBe(false);
    if (!parsed.success) expect(parsed.error.flatten().fieldErrors.division).toBeDefined();
  });

  it('requires the district to belong to the chosen division', () => {
    expect(TalentProfileDetailsSchema.safeParse({ ...details, division: 'Dhaka', district: 'Dhaka' }).success).toBe(true);
    expect(TalentProfileDetailsSchema.safeParse({ ...details, division: 'Dhaka', district: 'Chattogram' }).success).toBe(false);
  });

  it('caps the bio at 500 characters', () => {
    expect(TalentProfileDetailsSchema.safeParse({ ...details, bio: 'x'.repeat(501) }).success).toBe(false);
    expect(TalentProfileDetailsSchema.safeParse({ ...details, bio: 'x'.repeat(500) }).success).toBe(true);
  });
});

describe('showcase link schemas', () => {
  it('requires a full http(s) video link and limits the caption', () => {
    expect(ShowcaseVideoSchema.safeParse({ url: 'https://youtu.be/abc123' }).success).toBe(true);
    expect(ShowcaseVideoSchema.safeParse({ url: 'youtu.be/abc123' }).success).toBe(false);
    expect(ShowcaseVideoSchema.safeParse({ url: 'javascript:alert(1)' }).success).toBe(false);
    expect(ShowcaseVideoSchema.safeParse({ url: 'https://vimeo.com/123456', title: 'x'.repeat(MAX_SHOWCASE_TITLE + 1) }).success).toBe(false);
  });

  it('allows clearing a caption and blocks replacing a video with a bad link', () => {
    expect(ShowcaseUpdateSchema.safeParse({ title: '' }).success).toBe(true);
    expect(ShowcaseUpdateSchema.safeParse({ url: '' }).success).toBe(true);
    expect(ShowcaseUpdateSchema.safeParse({ url: 'ftp://example.com/file.mp4' }).success).toBe(false);
  });
});

describe('showcase helpers', () => {
  it('normalises WhatsApp numbers to +880 form', () => {
    expect(normaliseWhatsapp('01712345678')).toBe('+8801712345678');
    expect(normaliseWhatsapp('8801712345678')).toBe('+8801712345678');
    expect(normaliseWhatsapp('+880 1712-345678')).toBe('+8801712345678');
    expect(normaliseWhatsapp('123')).toBe('');
    expect(normaliseWhatsapp('')).toBe('');
  });

  it('keeps only full http(s) social links', () => {
    expect(normaliseSocialUrl(' https://youtube.com/@me ')).toBe('https://youtube.com/@me');
    expect(normaliseSocialUrl('javascript:alert(1)')).toBe('');
    expect(normaliseSocialUrl('/relative')).toBe('');
    expect(normaliseSocialUrl('')).toBe('');
  });

  it('builds inline players only for YouTube and Vimeo', () => {
    expect(showcaseVideoEmbed('https://www.youtube.com/watch?v=abc_123')).toEqual({ provider: 'youtube', src: 'https://www.youtube-nocookie.com/embed/abc_123' });
    expect(showcaseVideoEmbed('https://youtu.be/abc_123')).toEqual({ provider: 'youtube', src: 'https://www.youtube-nocookie.com/embed/abc_123' });
    expect(showcaseVideoEmbed('https://youtube.com/shorts/abc_123')).toEqual({ provider: 'youtube', src: 'https://www.youtube-nocookie.com/embed/abc_123' });
    expect(showcaseVideoEmbed('https://vimeo.com/123456789')).toEqual({ provider: 'vimeo', src: 'https://player.vimeo.com/video/123456789' });
    expect(showcaseVideoEmbed('https://example.com/watch?v=abc')).toBeNull();
    expect(showcaseVideoEmbed('javascript:alert(1)')).toBeNull();
    expect(showcaseVideoHost('https://www.youtube.com/watch?v=abc')).toBe('youtube.com');
  });

  it('builds YouTube poster thumbnails and leaves other hosts without one', () => {
    expect(showcaseVideoThumbnail('https://youtu.be/abc_123')).toBe('https://i.ytimg.com/vi/abc_123/hqdefault.jpg');
    expect(showcaseVideoThumbnail('https://www.youtube.com/watch?v=abc_123')).toBe('https://i.ytimg.com/vi/abc_123/hqdefault.jpg');
    expect(showcaseVideoThumbnail('https://vimeo.com/123456789')).toBeNull();
    expect(showcaseVideoThumbnail('javascript:alert(1)')).toBeNull();
  });

  it('reveals private fields only to the owner or when the toggle is on', () => {
    const privacy = { ...DEFAULT_PRIVACY, showPhone: true };
    expect(canReveal('phone', privacy, false)).toBe(true);
    expect(canReveal('email', privacy, false)).toBe(false);
    expect(canReveal('email', privacy, true)).toBe(true);
    expect(canReveal('rates', DEFAULT_PRIVACY, false)).toBe(true);
    expect(canReveal('address', DEFAULT_PRIVACY, false)).toBe(false);
  });

  it('formats rates in BDT by default', () => {
    expect(formatRate(1500)).toBe('৳1,500');
    expect(formatRate(null)).toBe('');
    expect(formatRate(1500, 'USD')).toBe('USD 1,500');
  });
});
