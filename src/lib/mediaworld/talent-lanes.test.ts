import { describe, expect, it } from 'vitest';
import { MEDIA_WORLD_SERVICE_CATEGORIES } from '../mediaworld';
import { TAXONOMY_INDUSTRIES } from './taxonomy-data';
import { talentLanes, talentMatchesLane } from './talent-lanes';

const identity = (mainCategory: string, designation: string) => ({
  mainCategory: { code: mainCategory },
  designation: { code: designation },
});

const laneOf = (mainCategory: string, designation: string) => [...talentLanes([identity(mainCategory, designation)])];

describe('Talent directory lanes', () => {
  it('files every seeded main category into exactly one real service lane', () => {
    for (const industry of TAXONOMY_INDUSTRIES) {
      for (const category of industry.categories) {
        const lanes = laneOf(category.code, 'NOT_A_REAL_DESIGNATION');
        expect(lanes, `${category.code} needs a lane`).toHaveLength(1);
        expect(MEDIA_WORLD_SERVICE_CATEGORIES).toContain(lanes[0]);
      }
    }
  });

  it('routes professions to the lane a client would search them under', () => {
    expect(laneOf('FILM_DIRECTION_WRITING', 'DIRECTOR')).toEqual(['DIRECTOR']);
    expect(laneOf('FILM_ACTING_TALENT', 'ACTRESS')).toEqual(['ARTIST']);
    expect(laneOf('TVC_ACTORS_MODELS', 'FASHION_MODEL')).toEqual(['ARTIST']);
    expect(laneOf('NATOK_CAMERA_CINEMATOGRAPHY', 'CINEMATOGRAPHER')).toEqual(['CAMERA_HOUSE']);
    expect(laneOf('FILM_EDITING_POST_PRODUCTION', 'COLORIST')).toEqual(['PRODUCTION']);
    expect(laneOf('MUSIC_VOCALS_PERFORMANCE', 'PLAYBACK_SINGER')).toEqual(['ARTIST']);
    expect(laneOf('TVC_ART_STYLING_MAKEUP', 'MAKEUP_ARTIST')).toEqual(['MAKEUP_MAN']);
  });

  it('lets a designation override the department it sits in', () => {
    expect(laneOf('FILM_CAMERA_CINEMATOGRAPHY', 'DRONE_OPERATOR')).toEqual(['DRONE']);
    expect(laneOf('TVC_PRODUCTION_COMPANIES_STUDIOS', 'CAMERA_EQUIPMENT_RENTAL')).toEqual(['CAMERA_HOUSE']);
    expect(laneOf('TVC_PRODUCTION_COMPANIES_STUDIOS', 'MODELING_AGENCY')).toEqual(['ARTIST']);
    expect(laneOf('NATOK_PHOTOGRAPHY_PROMOTION', 'YOUTUBE_CHANNEL_MANAGER')).toEqual(['PRODUCTION']);
  });

  it('collects a lane per identity so a multi-role profile is found under each', () => {
    const talent = { professionalIdentities: [identity('FILM_ACTING_TALENT', 'ACTOR'), identity('FILM_DIRECTION_WRITING', 'STORY_WRITER')] };
    expect([...talentLanes(talent.professionalIdentities)].sort()).toEqual(['ARTIST', 'DIRECTOR']);
    expect(talentMatchesLane(talent, 'ARTIST')).toBe(true);
    expect(talentMatchesLane(talent, 'DIRECTOR')).toBe(true);
    expect(talentMatchesLane(talent, 'CAMERA_HOUSE')).toBe(false);
  });

  it('keeps gear and location lanes honest: no profession is filed there', () => {
    const used = new Set(TAXONOMY_INDUSTRIES.flatMap((industry) => industry.categories).map((category) =>
      laneOf(category.code, 'NOT_A_REAL_DESIGNATION')[0],
    ));
    expect(used.has('SPOT')).toBe(false);
    expect(used.has('LIGHT_HOUSE')).toBe(false);
    expect(used.has('SHOOTING_BUS_CAR')).toBe(false);
  });

  it('shows an unmapped profile only under All', () => {
    const talent = { professionalIdentities: [identity('SOMETHING_NEW', 'SOMETHING_NEW')] };
    expect(talentLanes(talent.professionalIdentities).size).toBe(0);
    expect(talentMatchesLane(talent, 'ALL')).toBe(true);
    expect(talentMatchesLane(talent, 'ARTIST')).toBe(false);
  });
});
