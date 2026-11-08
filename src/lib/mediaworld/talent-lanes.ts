import type { MediaWorldServiceCategory } from '../mediaworld';

/**
 * Maps a talent's taxonomy identity onto the Media World service lanes used by the directory filters.
 * The profession taxonomy and `MarketplaceCategory` are separate vocabularies, so this is the join between them.
 */
type LaneNode = { code: string };
type LaneIdentity = { mainCategory: LaneNode; designation: LaneNode };

const LANE_BY_MAIN_CATEGORY: Record<string, MediaWorldServiceCategory> = {
  FILM_DIRECTION_WRITING: 'DIRECTOR',
  NATOK_DIRECTION_WRITING: 'DIRECTOR',
  TVC_DIRECTION_CREATIVE: 'DIRECTOR',

  FILM_ACTING_TALENT: 'ARTIST',
  NATOK_ACTING_ARTISTS: 'ARTIST',
  TVC_ACTORS_MODELS: 'ARTIST',
  FILM_COMPOSITION_LYRICS: 'ARTIST',
  NATOK_COMPOSITION_LYRICS: 'ARTIST',
  TVC_COMPOSITION_LYRICS: 'ARTIST',
  MUSIC_COMPOSITION_LYRICS: 'ARTIST',
  FILM_VOCALS_PERFORMANCE: 'ARTIST',
  NATOK_VOCALS_PERFORMANCE: 'ARTIST',
  TVC_VOCALS_PERFORMANCE: 'ARTIST',
  MUSIC_VOCALS_PERFORMANCE: 'ARTIST',
  FILM_INSTRUMENTALIST_MUSICIAN: 'ARTIST',
  NATOK_INSTRUMENTALIST_MUSICIAN: 'ARTIST',
  TVC_INSTRUMENTALIST_MUSICIAN: 'ARTIST',
  MUSIC_INSTRUMENTALIST_MUSICIAN: 'ARTIST',

  FILM_CAMERA_CINEMATOGRAPHY: 'CAMERA_HOUSE',
  NATOK_CAMERA_CINEMATOGRAPHY: 'CAMERA_HOUSE',
  TVC_CAMERA_CINEMATOGRAPHY: 'CAMERA_HOUSE',
  FILM_PHOTOGRAPHY_PUBLICITY: 'CAMERA_HOUSE',
  NATOK_PHOTOGRAPHY_PROMOTION: 'CAMERA_HOUSE',

  FILM_ART_MAKEUP_COSTUME: 'MAKEUP_MAN',
  NATOK_ART_MAKEUP_COSTUME: 'MAKEUP_MAN',
  TVC_ART_STYLING_MAKEUP: 'MAKEUP_MAN',

  FILM_PRODUCTION: 'PRODUCTION',
  NATOK_PRODUCTION: 'PRODUCTION',
  TVC_PRODUCTION: 'PRODUCTION',
  FILM_BUSINESS: 'PRODUCTION',
  NATOK_DRAMA_BUSINESS: 'PRODUCTION',
  TVC_ADVERTISING_MARKETING: 'PRODUCTION',
  TVC_PRODUCTION_COMPANIES_STUDIOS: 'PRODUCTION',
  FILM_EDITING_POST_PRODUCTION: 'PRODUCTION',
  NATOK_EDITING_POST_PRODUCTION: 'PRODUCTION',
  TVC_EDITING_POST_PRODUCTION: 'PRODUCTION',
  FILM_SOUND_PRODUCTION: 'PRODUCTION',
  NATOK_SOUND_PRODUCTION: 'PRODUCTION',
  TVC_SOUND_PRODUCTION: 'PRODUCTION',
  MUSIC_SOUND_PRODUCTION: 'PRODUCTION',
};

/** A designation can sit in the wrong department for its lane, so it wins over the main category. */
const LANE_BY_DESIGNATION: Record<string, MediaWorldServiceCategory> = {
  DRONE_OPERATOR: 'DRONE',
  CAMERA_EQUIPMENT_RENTAL: 'CAMERA_HOUSE',
  MODELING_AGENCY: 'ARTIST',
  CASTING_AGENCY: 'ARTIST',
  POSTER_DESIGNER: 'PRODUCTION',
  THUMBNAIL_DESIGNER: 'PRODUCTION',
  GRAPHIC_DESIGNER: 'PRODUCTION',
  DIGITAL_MARKETING_MANAGER: 'PRODUCTION',
  SOCIAL_MEDIA_MANAGER: 'PRODUCTION',
  YOUTUBE_CHANNEL_MANAGER: 'PRODUCTION',
};

/** SPOT, SHOOTING_BUS_CAR and LIGHT_HOUSE stay empty for people: they describe gear and locations, not professions. */
export function talentLanes(identities: readonly LaneIdentity[]): Set<MediaWorldServiceCategory> {
  const lanes = new Set<MediaWorldServiceCategory>();
  for (const identity of identities) {
    const lane = LANE_BY_DESIGNATION[identity.designation.code] ?? LANE_BY_MAIN_CATEGORY[identity.mainCategory.code];
    if (lane) lanes.add(lane);
  }
  return lanes;
}

export function talentMatchesLane(talent: { professionalIdentities: readonly LaneIdentity[] }, lane: string): boolean {
  if (lane === 'ALL') return true;
  return talentLanes(talent.professionalIdentities).has(lane as MediaWorldServiceCategory);
}
