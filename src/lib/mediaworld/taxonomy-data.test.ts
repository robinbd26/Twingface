import { describe, expect, it } from 'vitest';
import { TAXONOMY_INDUSTRIES, TAXONOMY_RENTAL_CATEGORIES } from './taxonomy-data';

function category(code: string) {
  for (const industry of TAXONOMY_INDUSTRIES) {
    const found = industry.categories.find((entry) => entry.code === code);
    if (found) return found;
  }
  throw new Error(`Missing category ${code}`);
}

function codes(code: string) {
  return category(code).designations.map((entry) => entry.code);
}

describe('Media World taxonomy data', () => {
  it('keeps only cinematographer, assistant cameraman and drone operator under Film camera', () => {
    expect(codes('FILM_CAMERA_CINEMATOGRAPHY')).toEqual(['CINEMATOGRAPHER', 'ASSISTANT_CAMERAMAN', 'DRONE_OPERATOR']);
  });

  it('drops retired Film professions and keeps the renamed VFX and Colorist', () => {
    expect(codes('FILM_ACTING_TALENT')).not.toContain('VOICE_ARTIST');
    expect(codes('FILM_PRODUCTION')).toContain('CASTING_DIRECTOR');
    expect(codes('FILM_EDITING_POST_PRODUCTION')).toContain('COLORIST');
    const vfx = category('FILM_EDITING_POST_PRODUCTION').designations.find((entry) => entry.code === 'VFX_ARTIST');
    expect(vfx?.nameEn).toBe('VFX');
  });

  it('applies the Natok removals and additions', () => {
    expect(codes('NATOK_CAMERA_CINEMATOGRAPHY')).toEqual(['CINEMATOGRAPHER', 'ASSISTANT_CAMERAMAN', 'DRONE_OPERATOR']);
    expect(codes('NATOK_ART_MAKEUP_COSTUME')).not.toContain('WARDROBE_ASSISTANT');
    expect(codes('NATOK_ACTING_ARTISTS')).toEqual(expect.arrayContaining(['VILLAIN', 'COMEDIC_ACTOR']));
    expect(codes('NATOK_DRAMA_BUSINESS')).toContain('OTT_PLATFORM');
  });

  it('applies the TVC removals', () => {
    const camera = codes('TVC_CAMERA_CINEMATOGRAPHY');
    expect(camera).not.toContain('DIRECTOR_OF_PHOTOGRAPHY');
    expect(camera).not.toContain('CAMERAMAN');
    const advertising = codes('TVC_ADVERTISING_MARKETING');
    expect(advertising).not.toContain('MEDIA_PLANNER');
    expect(advertising).not.toContain('MEDIA_BUYER');
    expect(codes('TVC_PRODUCTION_COMPANIES_STUDIOS')).not.toContain('SOUND_STUDIO');
  });

  it('structures Music as four categories with sound, vocal, composition and instrumental roles', () => {
    const music = TAXONOMY_INDUSTRIES.find((industry) => industry.code === 'MUSIC');
    expect(music?.categories.map((entry) => entry.code)).toEqual([
      'MUSIC_COMPOSITION_LYRICS',
      'MUSIC_VOCALS_PERFORMANCE',
      'MUSIC_SOUND_PRODUCTION',
      'MUSIC_INSTRUMENTALIST_MUSICIAN',
    ]);
    expect(codes('MUSIC_COMPOSITION_LYRICS')).toEqual(expect.arrayContaining(['MUSIC_DIRECTOR', 'COMPOSER', 'LYRICIST']));
    expect(codes('MUSIC_VOCALS_PERFORMANCE')).toEqual(expect.arrayContaining(['PLAYBACK_SINGER', 'DUBBING_ARTIST']));
    expect(codes('MUSIC_SOUND_PRODUCTION')).toEqual(expect.arrayContaining(['SOUND_RECORDIST', 'SOUND_DESIGNER', 'SOUND_ENGINEER']));
    expect(codes('MUSIC_INSTRUMENTALIST_MUSICIAN')).toEqual(['INSTRUMENTALIST']);
  });

  it('splits Film, Natok and TVC sound work into the same four categories as Music', () => {
    for (const prefix of ['FILM', 'NATOK', 'TVC']) {
      const industry = TAXONOMY_INDUSTRIES.find((entry) => entry.code === prefix);
      const categoryCodes = industry?.categories.map((entry) => entry.code) ?? [];
      const soundCodes = [
        `${prefix}_COMPOSITION_LYRICS`,
        `${prefix}_VOCALS_PERFORMANCE`,
        `${prefix}_SOUND_PRODUCTION`,
        `${prefix}_INSTRUMENTALIST_MUSICIAN`,
      ];
      expect(categoryCodes).toEqual(expect.arrayContaining(soundCodes));
      expect(categoryCodes).not.toContain(`${prefix}_SOUND_MUSIC`);

      const designations = soundCodes.flatMap(codes);
      expect(designations).toEqual(
        expect.arrayContaining([
          'MUSIC_DIRECTOR',
          'COMPOSER',
          'LYRICIST',
          'PLAYBACK_SINGER',
          'DUBBING_ARTIST',
          'SOUND_RECORDIST',
          'SOUND_DESIGNER',
          'SOUND_ENGINEER',
          'INSTRUMENTALIST',
        ]),
      );
    }
  });

  it('keeps the TVC-only sound roles in the new TVC categories', () => {
    expect(codes('TVC_COMPOSITION_LYRICS')).toEqual(expect.arrayContaining(['JINGLE_WRITER', 'JINGLE_COMPOSER']));
    expect(codes('TVC_VOCALS_PERFORMANCE')).toEqual(
      expect.arrayContaining(['VOICE_OVER_DIRECTOR', 'VOICE_OVER_ARTIST']),
    );
    expect(codes('TVC_SOUND_PRODUCTION')).toContain('DUBBING_ENGINEER');
  });

  it('uses one name per designation code across shared categories', () => {
    const seen = new Map<string, string>();
    for (const industry of TAXONOMY_INDUSTRIES) {
      for (const entry of industry.categories) {
        for (const designation of entry.designations) {
          const existing = seen.get(designation.code);
          if (existing) {
            expect(`${designation.code}=${designation.nameEn}`).toBe(existing);
          } else {
            seen.set(designation.code, `${designation.code}=${designation.nameEn}`);
          }
        }
      }
    }
  });
});

function rentalSubcategoryCodes(categoryCode: string) {
  const found = TAXONOMY_RENTAL_CATEGORIES.find((entry) => entry.code === categoryCode);
  if (!found) throw new Error(`Missing rental category ${categoryCode}`);
  return found.subcategories.map((entry) => entry.code);
}

describe('Rental taxonomy data', () => {
  it('keeps the seven rental lanes in display order', () => {
    expect(TAXONOMY_RENTAL_CATEGORIES.map((entry) => entry.code)).toEqual([
      'VEHICLES',
      'LOCATIONS',
      'CAMERA',
      'LIGHTING',
      'SOUND',
      'PRODUCTION',
      'OTHER',
    ]);
  });

  it('has a real subcategory for everything a provider was asked to rent out', () => {
    // Cars, bikes, lights, prop weapons, sound systems, props, drones and shooting houses are
    // named by providers, so each needs its own bucket instead of hiding inside "Other".
    expect(rentalSubcategoryCodes('VEHICLES')).toEqual(expect.arrayContaining(['CAR', 'MOTORBIKE']));
    expect(rentalSubcategoryCodes('LIGHTING')).toContain('LED_LIGHT');
    expect(rentalSubcategoryCodes('SOUND')).toContain('SOUND_SYSTEM');
    expect(rentalSubcategoryCodes('PRODUCTION')).toEqual(expect.arrayContaining(['SET_PROPS', 'PROP_WEAPONS']));
    expect(rentalSubcategoryCodes('CAMERA')).toContain('DRONE');
    expect(rentalSubcategoryCodes('LOCATIONS')).toContain('SHOOTING_HOUSE');
  });

  it('labels the weapon lane as film props so it is not read as a firearms marketplace', () => {
    const weapons = TAXONOMY_RENTAL_CATEGORIES
      .flatMap((entry) => entry.subcategories)
      .find((entry) => entry.code === 'PROP_WEAPONS');

    expect(weapons?.nameEn).toContain('film props only');
    expect(weapons?.nameBn).toContain('শুটিং প্রপ');
  });

  it('gives every rental node both language names and a unique code', () => {
    const seen = new Set<string>();
    for (const category of TAXONOMY_RENTAL_CATEGORIES) {
      expect(category.nameEn.length).toBeGreaterThan(0);
      expect(category.nameBn.length).toBeGreaterThan(0);
      expect(category.subcategories.length).toBeGreaterThan(0);
      for (const subcategory of category.subcategories) {
        expect(subcategory.nameEn.length).toBeGreaterThan(0);
        expect(subcategory.nameBn.length).toBeGreaterThan(0);
        expect(seen.has(subcategory.code)).toBe(false);
        seen.add(subcategory.code);
      }
    }
  });
});
