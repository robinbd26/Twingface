export interface TaxonomyItem {
  code: string;
  nameEn: string;
  nameBn: string;
}

export type TaxonomyDesignation = TaxonomyItem;

export interface TaxonomyCategory extends TaxonomyItem {
  designations: TaxonomyDesignation[];
}

export interface TaxonomyIndustry extends TaxonomyItem {
  categories: TaxonomyCategory[];
}

export interface RentalTaxonomyCategory extends TaxonomyItem {
  subcategories: TaxonomyItem[];
}

const d = (code: string, nameEn: string, nameBn: string): TaxonomyDesignation => ({
  code,
  nameEn,
  nameBn,
});

// Every industry splits sound work the same way, so the shared roles live in one
// place and each industry maps them onto its own category codes.
const SOUND_COMPOSITION_LYRICS: TaxonomyDesignation[] = [
  d('MUSIC_DIRECTOR', 'Music Director', 'সংগীত পরিচালক'),
  d('COMPOSER', 'Composer', 'সুরকার'),
  d('BGM_COMPOSER', 'Background Music Composer (BGM)', 'ব্যাকগ্রাউন্ড মিউজিক সুরকার (BGM)'),
  d('LYRICIST', 'Lyricist', 'গীতিকার'),
];

const SOUND_VOCALS_PERFORMANCE: TaxonomyDesignation[] = [
  d('SINGER_VOCALIST', 'Singer & Vocalist', 'সংগীতশিল্পী / গায়ক-গায়িকা'),
  d('PLAYBACK_SINGER', 'Playback Singer', 'নেপথ্য গায়ক'),
  d('DUBBING_ARTIST', 'Dubbing Artist', 'ডাবিং আর্টিস্ট'),
];

const SOUND_PRODUCTION_MIXING: TaxonomyDesignation[] = [
  d('SOUND_RECORDIST', 'Sound Recordist', 'সাউন্ড রেকর্ডিস্ট'),
  d('SOUND_DESIGNER', 'Sound Designer', 'সাউন্ড ডিজাইনার'),
  d('SOUND_ENGINEER', 'Sound Engineer', 'সাউন্ড ইঞ্জিনিয়ার'),
  d('MIXING_MASTERING_ENGINEER', 'Mixing & Mastering Engineer', 'মিক্সিং ও মাস্টারিং ইঞ্জিনিয়ার'),
  d('MUSIC_PRODUCER', 'Music Producer', 'সংগীত প্রযোজক'),
];

const SOUND_INSTRUMENTALIST: TaxonomyDesignation[] = [
  d('INSTRUMENTALIST', 'Instrumentalist & Musician', 'বাদ্যযন্ত্র শিল্পী'),
];

export const TAXONOMY_INDUSTRIES: TaxonomyIndustry[] = [
  {
    code: 'FILM',
    nameEn: 'Film',
    nameBn: 'চলচ্চিত্র',
    categories: [
      {
        code: 'FILM_DIRECTION_WRITING',
        nameEn: 'Direction & Writing',
        nameBn: 'পরিচালনা ও লেখালেখি',
        designations: [
          d('DIRECTOR', 'Director', 'পরিচালক'),
          d('ASSISTANT_DIRECTOR', 'Assistant Director', 'সহকারী পরিচালক'),
          d('CHIEF_ASSISTANT_DIRECTOR', 'Chief Assistant Director', 'প্রধান সহকারী পরিচালক'),
          d('SCREENWRITER', 'Screenwriter', 'চিত্রনাট্যকার'),
          d('STORY_WRITER', 'Story Writer', 'কাহিনিকার'),
          d('DIALOGUE_WRITER', 'Dialogue Writer', 'সংলাপ লেখক'),
        ],
      },
      {
        code: 'FILM_PRODUCTION',
        nameEn: 'Production',
        nameBn: 'প্রযোজনা',
        designations: [
          d('FILM_PRODUCER', 'Film Producer', 'চলচ্চিত্র প্রযোজক'),
          d('EXECUTIVE_PRODUCER', 'Executive Producer', 'নির্বাহী প্রযোজক'),
          d('LINE_PRODUCER', 'Line Producer', 'লাইন প্রযোজক'),
          d('PRODUCTION_MANAGER', 'Production Manager', 'প্রোডাকশন ম্যানেজার'),
          d('PRODUCTION_COORDINATOR', 'Production Coordinator', 'প্রোডাকশন কো-অর্ডিনেটর'),
          d('CASTING_DIRECTOR', 'Casting Director', 'কাস্টিং ডিরেক্টর'),
          d('LOCATION_MANAGER', 'Location Manager', 'লোকেশন ম্যানেজার'),
        ],
      },
      {
        code: 'FILM_ACTING_TALENT',
        nameEn: 'Acting & Talent',
        nameBn: 'অভিনয় ও শিল্পী',
        designations: [
          d('ACTOR', 'Actor', 'অভিনেতা'),
          d('ACTRESS', 'Actress', 'অভিনেত্রী'),
          d('SUPPORTING_ACTOR_ACTRESS', 'Supporting Actor/Actress', 'পার্শ্ব অভিনেতা/অভিনেত্রী'),
          d('CHARACTER_ACTOR', 'Character Actor', 'চরিত্রাভিনেতা'),
          d('CHILD_ACTOR', 'Child Actor', 'শিশু শিল্পী'),
          d('JUNIOR_ARTIST', 'Junior Artist', 'জুনিয়র শিল্পী'),
          d('STUNT_PERFORMER', 'Stunt Performer', 'স্টান্ট শিল্পী'),
        ],
      },
      {
        code: 'FILM_CAMERA_CINEMATOGRAPHY',
        nameEn: 'Camera & Cinematography',
        nameBn: 'ক্যামেরা ও চিত্রগ্রহণ',
        designations: [
          d('CINEMATOGRAPHER', 'Cinematographer', 'চিত্রগ্রাহক'),
          d('ASSISTANT_CAMERAMAN', 'Assistant Cameraman', 'সহকারী ক্যামেরাম্যান'),
          d('DRONE_OPERATOR', 'Drone Operator', 'ড্রোন অপারেটর'),
        ],
      },
      {
        code: 'FILM_EDITING_POST_PRODUCTION',
        nameEn: 'Editing & Post-production',
        nameBn: 'এডিটিং ও পোস্ট-প্রোডাকশন',
        designations: [
          d('FILM_EDITOR', 'Film Editor', 'ফিল্ম এডিটর'),
          d('VIDEO_EDITOR', 'Video Editor', 'ভিডিও এডিটর'),
          d('COLORIST', 'Colorist', 'কালারিস্ট'),
          d('VFX_ARTIST', 'VFX', 'VFX'),
          d('MOTION_GRAPHICS_DESIGNER', 'Motion Graphics Designer', 'মোশন গ্রাফিক্স ডিজাইনার'),
          d('ANIMATOR', 'Animator', 'অ্যানিমেটর'),
        ],
      },
      {
        code: 'FILM_COMPOSITION_LYRICS',
        nameEn: 'Composition & Lyrics',
        nameBn: 'সংগীত রচনা ও গীতি',
        designations: SOUND_COMPOSITION_LYRICS,
      },
      {
        code: 'FILM_VOCALS_PERFORMANCE',
        nameEn: 'Vocals & Performance',
        nameBn: 'কণ্ঠ ও পরিবেশনা',
        designations: SOUND_VOCALS_PERFORMANCE,
      },
      {
        code: 'FILM_SOUND_PRODUCTION',
        nameEn: 'Sound Production & Mixing',
        nameBn: 'সাউন্ড প্রযোজনা ও মিক্সিং',
        designations: SOUND_PRODUCTION_MIXING,
      },
      {
        code: 'FILM_INSTRUMENTALIST_MUSICIAN',
        nameEn: 'Instrumentalist & Musician',
        nameBn: 'বাদ্যযন্ত্র শিল্পী ও সংগীতজ্ঞ',
        designations: SOUND_INSTRUMENTALIST,
      },
      {
        code: 'FILM_ART_MAKEUP_COSTUME',
        nameEn: 'Art, Makeup & Costume',
        nameBn: 'আর্ট, মেকআপ ও পোশাক',
        designations: [
          d('ART_DIRECTOR', 'Art Director', 'আর্ট ডিরেক্টর'),
          d('PRODUCTION_DESIGNER', 'Production Designer', 'প্রোডাকশন ডিজাইনার'),
          d('SET_DESIGNER', 'Set Designer', 'সেট ডিজাইনার'),
          d('PROPS_MASTER', 'Props Master', 'প্রপস মাস্টার'),
          d('MAKEUP_ARTIST', 'Makeup Artist', 'মেকআপ আর্টিস্ট'),
          d('HAIR_STYLIST', 'Hair Stylist', 'হেয়ার স্টাইলিস্ট'),
          d('COSTUME_DESIGNER', 'Costume Designer', 'কস্টিউম ডিজাইনার'),
        ],
      },
      {
        code: 'FILM_PHOTOGRAPHY_PUBLICITY',
        nameEn: 'Photography & Publicity',
        nameBn: 'ফটোগ্রাফি ও প্রচার',
        designations: [
          d('PHOTOGRAPHER', 'Photographer', 'ফটোগ্রাফার'),
          d('BEHIND_THE_SCENES_PHOTOGRAPHER', 'Behind-the-Scenes Photographer', 'বিহাইন্ড-দ্য-সিনস ফটোগ্রাফার'),
          d('POSTER_DESIGNER', 'Poster Designer', 'পোস্টার ডিজাইনার'),
          d('GRAPHIC_DESIGNER', 'Graphic Designer', 'গ্রাফিক ডিজাইনার'),
          d('DIGITAL_MARKETING_MANAGER', 'Digital Marketing Manager', 'ডিজিটাল মার্কেটিং ম্যানেজার'),
        ],
      },
      {
        code: 'FILM_BUSINESS',
        nameEn: 'Film Business',
        nameBn: 'চলচ্চিত্র ব্যবসা ও প্রতিষ্ঠান',
        designations: [
          d('PRODUCTION_HOUSE', 'Production House', 'প্রোডাকশন হাউস'),
          d('FILM_DISTRIBUTOR', 'Film Distributor', 'চলচ্চিত্র পরিবেশক'),
          d('FILM_STUDIO', 'Film Studio', 'ফিল্ম স্টুডিও'),
          d('CAMERA_EQUIPMENT_RENTAL', 'Camera & Equipment Rental', 'ক্যামেরা ও ইকুইপমেন্ট ভাড়া'),
        ],
      },
    ],
  },
  {
    code: 'NATOK',
    nameEn: 'Natok',
    nameBn: 'নাটক',
    categories: [
      {
        code: 'NATOK_DIRECTION_WRITING',
        nameEn: 'Direction & Writing',
        nameBn: 'পরিচালনা ও লেখালেখি',
        designations: [
          d('DRAMA_DIRECTOR', 'Drama Director', 'নাটক পরিচালক'),
          d('ASSISTANT_DIRECTOR', 'Assistant Director', 'সহকারী পরিচালক'),
          d('CHIEF_ASSISTANT_DIRECTOR', 'Chief Assistant Director', 'প্রধান সহকারী পরিচালক'),
          d('PLAYWRIGHT', 'Playwright', 'নাট্যকার'),
          d('STORY_WRITER', 'Story Writer', 'কাহিনিকার'),
          d('SCREENWRITER', 'Screenwriter', 'চিত্রনাট্যকার'),
          d('DIALOGUE_WRITER', 'Dialogue Writer', 'সংলাপ লেখক'),
        ],
      },
      {
        code: 'NATOK_PRODUCTION',
        nameEn: 'Production',
        nameBn: 'প্রযোজনা',
        designations: [
          d('DRAMA_PRODUCER', 'Drama Producer', 'নাটক প্রযোজক'),
          d('EXECUTIVE_PRODUCER', 'Executive Producer', 'নির্বাহী প্রযোজক'),
          d('LINE_PRODUCER', 'Line Producer', 'লাইন প্রযোজক'),
          d('PRODUCTION_MANAGER', 'Production Manager', 'প্রোডাকশন ম্যানেজার'),
          d('PRODUCTION_COORDINATOR', 'Production Coordinator', 'প্রোডাকশন কো-অর্ডিনেটর'),
          d('LOCATION_MANAGER', 'Location Manager', 'লোকেশন ম্যানেজার'),
          d('CASTING_DIRECTOR', 'Casting Director', 'কাস্টিং ডিরেক্টর'),
        ],
      },
      {
        code: 'NATOK_ACTING_ARTISTS',
        nameEn: 'Acting & Artists',
        nameBn: 'অভিনয় ও শিল্পী',
        designations: [
          d('ACTOR', 'Actor', 'অভিনেতা'),
          d('ACTRESS', 'Actress', 'অভিনেত্রী'),
          d('SUPPORTING_ACTOR_ACTRESS', 'Supporting Actor/Actress', 'পার্শ্ব অভিনেতা/অভিনেত্রী'),
          d('VILLAIN', 'Villain', 'খলনায়ক'),
          d('COMEDIC_ACTOR', 'Comedic Actor', 'কৌতুক অভিনেতা'),
          d('CHILD_ACTOR', 'Child Actor', 'শিশু শিল্পী'),
          d('JUNIOR_ARTIST', 'Junior Artist', 'জুনিয়র শিল্পী'),
          d('PRESENTER_HOST', 'Presenter / Host', 'উপস্থাপক'),
          d('VOICE_ARTIST', 'Voice Artist', 'ভয়েস আর্টিস্ট'),
        ],
      },
      {
        code: 'NATOK_CAMERA_CINEMATOGRAPHY',
        nameEn: 'Camera & Cinematography',
        nameBn: 'ক্যামেরা ও চিত্রগ্রহণ',
        designations: [
          d('CINEMATOGRAPHER', 'Cinematographer', 'চিত্রগ্রাহক'),
          d('ASSISTANT_CAMERAMAN', 'Assistant Cameraman', 'সহকারী ক্যামেরাম্যান'),
          d('DRONE_OPERATOR', 'Drone Operator', 'ড্রোন অপারেটর'),
        ],
      },
      {
        code: 'NATOK_EDITING_POST_PRODUCTION',
        nameEn: 'Editing & Post-production',
        nameBn: 'এডিটিং ও পোস্ট-প্রোডাকশন',
        designations: [
          d('DRAMA_EDITOR', 'Drama Editor', 'নাটক সম্পাদক'),
          d('VIDEO_EDITOR', 'Video Editor', 'ভিডিও এডিটর'),
          d('COLORIST', 'Colorist', 'কালারিস্ট'),
          d('VFX_ARTIST', 'VFX', 'VFX'),
          d('MOTION_GRAPHICS_DESIGNER', 'Motion Graphics Designer', 'মোশন গ্রাফিক্স ডিজাইনার'),
          d('SUBTITLE_EDITOR', 'Subtitle Editor', 'সাবটাইটেল সম্পাদক'),
        ],
      },
      {
        code: 'NATOK_COMPOSITION_LYRICS',
        nameEn: 'Composition & Lyrics',
        nameBn: 'সংগীত রচনা ও গীতি',
        designations: SOUND_COMPOSITION_LYRICS,
      },
      {
        code: 'NATOK_VOCALS_PERFORMANCE',
        nameEn: 'Vocals & Performance',
        nameBn: 'কণ্ঠ ও পরিবেশনা',
        designations: SOUND_VOCALS_PERFORMANCE,
      },
      {
        code: 'NATOK_SOUND_PRODUCTION',
        nameEn: 'Sound Production & Mixing',
        nameBn: 'সাউন্ড প্রযোজনা ও মিক্সিং',
        designations: SOUND_PRODUCTION_MIXING,
      },
      {
        code: 'NATOK_INSTRUMENTALIST_MUSICIAN',
        nameEn: 'Instrumentalist & Musician',
        nameBn: 'বাদ্যযন্ত্র শিল্পী ও সংগীতজ্ঞ',
        designations: SOUND_INSTRUMENTALIST,
      },
      {
        code: 'NATOK_ART_MAKEUP_COSTUME',
        nameEn: 'Art, Makeup & Costume',
        nameBn: 'সেট, মেকআপ ও পোশাক',
        designations: [
          d('ART_DIRECTOR', 'Art Director', 'আর্ট ডিরেক্টর'),
          d('SET_DESIGNER', 'Set Designer', 'সেট ডিজাইনার'),
          d('PROPS_MANAGER', 'Props Manager', 'প্রপস ম্যানেজার'),
          d('MAKEUP_ARTIST', 'Makeup Artist', 'মেকআপ আর্টিস্ট'),
          d('HAIR_STYLIST', 'Hair Stylist', 'হেয়ার স্টাইলিস্ট'),
          d('COSTUME_DESIGNER', 'Costume Designer', 'কস্টিউম ডিজাইনার'),
        ],
      },
      {
        code: 'NATOK_PHOTOGRAPHY_PROMOTION',
        nameEn: 'Photography & Promotion',
        nameBn: 'ফটোগ্রাফি ও প্রচার',
        designations: [
          d('PHOTOGRAPHER', 'Photographer', 'ফটোগ্রাফার'),
          d('BEHIND_THE_SCENES_VIDEOGRAPHER', 'Behind-the-Scenes Videographer', 'বিহাইন্ড-দ্য-সিনস ভিডিওগ্রাফার'),
          d('POSTER_DESIGNER', 'Poster Designer', 'পোস্টার ডিজাইনার'),
          d('THUMBNAIL_DESIGNER', 'Thumbnail Designer', 'থাম্বনেইল ডিজাইনার'),
          d('SOCIAL_MEDIA_MANAGER', 'Social Media Manager', 'সোশ্যাল মিডিয়া ম্যানেজার'),
          d('YOUTUBE_CHANNEL_MANAGER', 'YouTube Channel Manager', 'ইউটিউব চ্যানেল ম্যানেজার'),
        ],
      },
      {
        code: 'NATOK_DRAMA_BUSINESS',
        nameEn: 'Drama Business',
        nameBn: 'নাটক ও কনটেন্ট প্রযোজনা প্রতিষ্ঠান',
        designations: [
          d('DRAMA_PRODUCTION_HOUSE', 'Drama Production House', 'নাটক প্রোডাকশন হাউস'),
          d('TELEFILM_PRODUCTION_HOUSE', 'Telefilm Production House', 'টেলিফিল্ম প্রোডাকশন হাউস'),
          d('WEB_DRAMA_PRODUCTION_HOUSE', 'Web Drama Production House', 'ওয়েব নাটক প্রোডাকশন হাউস'),
          d('DUBBING_STUDIO', 'Dubbing Studio', 'ডাবিং স্টুডিও'),
          d('POST_PRODUCTION_STUDIO', 'Post-production Studio', 'পোস্ট-প্রোডাকশন স্টুডিও'),
          d('OTT_PLATFORM', 'OTT Platform', 'ওটিটি প্ল্যাটফর্ম'),
        ],
      },
    ],
  },
  {
    code: 'TVC',
    nameEn: 'TVC',
    nameBn: 'বিজ্ঞাপনচিত্র',
    categories: [
      {
        code: 'TVC_DIRECTION_CREATIVE',
        nameEn: 'Direction & Creative',
        nameBn: 'পরিচালনা ও সৃজনশীল বিভাগ',
        designations: [
          d('COMMERCIAL_DIRECTOR', 'Commercial Director', 'বিজ্ঞাপন পরিচালক'),
          d('CREATIVE_DIRECTOR', 'Creative Director', 'ক্রিয়েটিভ ডিরেক্টর'),
          d('ART_DIRECTOR', 'Art Director', 'আর্ট ডিরেক্টর'),
          d('COPYWRITER', 'Copywriter', 'কপিরাইটার'),
          d('SCRIPTWRITER', 'Scriptwriter', 'স্ক্রিপ্ট রাইটার'),
          d('CONCEPT_DEVELOPER', 'Concept Developer', 'কনসেপ্ট ডেভেলপার'),
          d('STORYBOARD_ARTIST', 'Storyboard Artist', 'স্টোরিবোর্ড শিল্পী'),
          d('CREATIVE_PRODUCER', 'Creative Producer', 'ক্রিয়েটিভ প্রডিউসার'),
        ],
      },
      {
        code: 'TVC_PRODUCTION',
        nameEn: 'Production',
        nameBn: 'প্রযোজনা',
        designations: [
          d('COMMERCIAL_PRODUCER', 'Commercial Producer', 'বিজ্ঞাপন প্রযোজক'),
          d('EXECUTIVE_PRODUCER', 'Executive Producer', 'নির্বাহী প্রযোজক'),
          d('LINE_PRODUCER', 'Line Producer', 'লাইন প্রযোজক'),
          d('PRODUCTION_MANAGER', 'Production Manager', 'প্রোডাকশন ম্যানেজার'),
          d('PRODUCTION_COORDINATOR', 'Production Coordinator', 'প্রোডাকশন কো-অর্ডিনেটর'),
          d('LOCATION_MANAGER', 'Location Manager', 'লোকেশন ম্যানেজার'),
          d('CASTING_DIRECTOR', 'Casting Director', 'কাস্টিং ডিরেক্টর'),
          d('TALENT_COORDINATOR', 'Talent Coordinator', 'ট্যালেন্ট কো-অর্ডিনেটর'),
        ],
      },
      {
        code: 'TVC_ACTORS_MODELS',
        nameEn: 'Actors & Models',
        nameBn: 'অভিনেতা ও মডেল',
        designations: [
          d('COMMERCIAL_ACTOR', 'Commercial Actor', 'বিজ্ঞাপন অভিনেতা'),
          d('COMMERCIAL_ACTRESS', 'Commercial Actress', 'বিজ্ঞাপন অভিনেত্রী'),
          d('COMMERCIAL_MODEL', 'Commercial Model', 'বিজ্ঞাপন মডেল'),
          d('FASHION_MODEL', 'Fashion Model', 'ফ্যাশন মডেল'),
          d('PRODUCT_MODEL', 'Product Model', 'প্রোডাক্ট মডেল'),
          d('HAND_MODEL', 'Hand Model', 'হ্যান্ড মডেল'),
          d('CHILD_MODEL', 'Child Model', 'শিশু মডেল'),
          d('BRAND_AMBASSADOR', 'Brand Ambassador', 'ব্র্যান্ড অ্যাম্বাসেডর'),
          d('INFLUENCER', 'Influencer', 'ইনফ্লুয়েন্সার'),
          d('VOICE_OVER_ARTIST', 'Voice-over Artist', 'ভয়েসওভার শিল্পী'),
          d('PRESENTER_HOST', 'Presenter / Host', 'উপস্থাপক'),
        ],
      },
      {
        code: 'TVC_CAMERA_CINEMATOGRAPHY',
        nameEn: 'Camera & Cinematography',
        nameBn: 'ক্যামেরা ও চিত্রগ্রহণ',
        designations: [
          d('COMMERCIAL_CINEMATOGRAPHER', 'Commercial Cinematographer', 'বিজ্ঞাপন চিত্রগ্রাহক'),
          d('CAMERA_OPERATOR', 'Camera Operator', 'ক্যামেরা অপারেটর'),
          d('ASSISTANT_CAMERAMAN', 'Assistant Cameraman', 'সহকারী ক্যামেরাম্যান'),
          d('DRONE_OPERATOR', 'Drone Operator', 'ড্রোন অপারেটর'),
          d('PRODUCT_PHOTOGRAPHER', 'Product Photographer', 'প্রোডাক্ট ফটোগ্রাফার'),
          d('FOOD_PHOTOGRAPHER', 'Food Photographer', 'ফুড ফটোগ্রাফার'),
        ],
      },
      {
        code: 'TVC_EDITING_POST_PRODUCTION',
        nameEn: 'Editing & Post-production',
        nameBn: 'এডিটিং ও পোস্ট-প্রোডাকশন',
        designations: [
          d('COMMERCIAL_VIDEO_EDITOR', 'Commercial Video Editor', 'বিজ্ঞাপন ভিডিও এডিটর'),
          d('VIDEO_EDITOR', 'Video Editor', 'ভিডিও এডিটর'),
          d('COLORIST', 'Colorist', 'কালারিস্ট'),
          d('VFX_ARTIST', 'VFX', 'VFX'),
          d('MOTION_GRAPHICS_DESIGNER', 'Motion Graphics Designer', 'মোশন গ্রাফিক্স ডিজাইনার'),
          d('ANIMATOR_2D_3D', '2D / 3D Animator', '2D / 3D অ্যানিমেটর'),
          d('CGI_ARTIST', 'CGI Artist', 'CGI আর্টিস্ট'),
          d('POST_PRODUCTION_SUPERVISOR', 'Post-production Supervisor', 'পোস্ট-প্রোডাকশন সুপারভাইজার'),
        ],
      },
      {
        code: 'TVC_COMPOSITION_LYRICS',
        nameEn: 'Composition & Lyrics',
        nameBn: 'সংগীত রচনা ও গীতি',
        designations: [
          ...SOUND_COMPOSITION_LYRICS,
          d('JINGLE_WRITER', 'Jingle Writer', 'জিঙ্গেল রাইটার'),
          d('JINGLE_COMPOSER', 'Jingle Composer', 'জিঙ্গেল কম্পোজার'),
        ],
      },
      {
        code: 'TVC_VOCALS_PERFORMANCE',
        nameEn: 'Vocals & Performance',
        nameBn: 'কণ্ঠ ও পরিবেশনা',
        designations: [
          ...SOUND_VOCALS_PERFORMANCE,
          d('VOICE_OVER_DIRECTOR', 'Voice-over Director', 'ভয়েসওভার পরিচালক'),
          d('VOICE_OVER_ARTIST', 'Voice-over Artist', 'ভয়েসওভার শিল্পী'),
        ],
      },
      {
        code: 'TVC_SOUND_PRODUCTION',
        nameEn: 'Sound Production & Mixing',
        nameBn: 'সাউন্ড প্রযোজনা ও মিক্সিং',
        designations: [...SOUND_PRODUCTION_MIXING, d('DUBBING_ENGINEER', 'Dubbing Engineer', 'ডাবিং ইঞ্জিনিয়ার')],
      },
      {
        code: 'TVC_INSTRUMENTALIST_MUSICIAN',
        nameEn: 'Instrumentalist & Musician',
        nameBn: 'বাদ্যযন্ত্র শিল্পী ও সংগীতজ্ঞ',
        designations: SOUND_INSTRUMENTALIST,
      },
      {
        code: 'TVC_ART_STYLING_MAKEUP',
        nameEn: 'Art, Styling & Makeup',
        nameBn: 'সেট, স্টাইলিং ও মেকআপ',
        designations: [
          d('PRODUCTION_DESIGNER', 'Production Designer', 'প্রোডাকশন ডিজাইনার'),
          d('SET_DESIGNER', 'Set Designer', 'সেট ডিজাইনার'),
          d('SET_DECORATOR', 'Set Decorator', 'সেট ডেকোরেটর'),
          d('PROPS_STYLIST', 'Props Stylist', 'প্রপস স্টাইলিস্ট'),
          d('PRODUCT_STYLIST', 'Product Stylist', 'প্রোডাক্ট স্টাইলিস্ট'),
          d('FOOD_STYLIST', 'Food Stylist', 'ফুড স্টাইলিস্ট'),
          d('FASHION_STYLIST', 'Fashion Stylist', 'ফ্যাশন স্টাইলিস্ট'),
          d('MAKEUP_ARTIST', 'Makeup Artist', 'মেকআপ আর্টিস্ট'),
          d('HAIR_STYLIST', 'Hair Stylist', 'হেয়ার স্টাইলিস্ট'),
          d('COSTUME_DESIGNER', 'Costume Designer', 'কস্টিউম ডিজাইনার'),
        ],
      },
      {
        code: 'TVC_ADVERTISING_MARKETING',
        nameEn: 'Advertising & Marketing',
        nameBn: 'বিজ্ঞাপন ও মার্কেটিং',
        designations: [
          d('ADVERTISING_AGENCY', 'Advertising Agency', 'বিজ্ঞাপন সংস্থা'),
          d('ACCOUNT_MANAGER', 'Account Manager', 'অ্যাকাউন্ট ম্যানেজার'),
          d('ACCOUNT_EXECUTIVE', 'Account Executive', 'অ্যাকাউন্ট এক্সিকিউটিভ'),
          d('BRAND_MANAGER', 'Brand Manager', 'ব্র্যান্ড ম্যানেজার'),
          d('MARKETING_MANAGER', 'Marketing Manager', 'মার্কেটিং ম্যানেজার'),
          d('DIGITAL_MARKETING_MANAGER', 'Digital Marketing Manager', 'ডিজিটাল মার্কেটিং ম্যানেজার'),
          d('SOCIAL_MEDIA_MANAGER', 'Social Media Manager', 'সোশ্যাল মিডিয়া ম্যানেজার'),
          d('GRAPHIC_DESIGNER', 'Graphic Designer', 'গ্রাফিক ডিজাইনার'),
          d('ADVERTISING_CAMPAIGN_MANAGER', 'Advertising Campaign Manager', 'বিজ্ঞাপন ক্যাম্পেইন ম্যানেজার'),
        ],
      },
      {
        code: 'TVC_PRODUCTION_COMPANIES_STUDIOS',
        nameEn: 'Production Companies & Studios',
        nameBn: 'প্রতিষ্ঠান ও স্টুডিও',
        designations: [
          d('ADVERTISING_PRODUCTION_HOUSE', 'Advertising Production House', 'বিজ্ঞাপন প্রোডাকশন হাউস'),
          d('VIDEO_PRODUCTION_COMPANY', 'Video Production Company', 'ভিডিও প্রোডাকশন কোম্পানি'),
          d('ADVERTISING_AGENCY', 'Advertising Agency', 'বিজ্ঞাপন সংস্থা'),
          d('PHOTOGRAPHY_STUDIO', 'Photography Studio', 'ফটোগ্রাফি স্টুডিও'),
          d('POST_PRODUCTION_STUDIO', 'Post-production Studio', 'পোস্ট-প্রোডাকশন স্টুডিও'),
          d('CAMERA_EQUIPMENT_RENTAL', 'Camera & Equipment Rental', 'ক্যামেরা ও ইকুইপমেন্ট ভাড়া'),
          d('MODELING_AGENCY', 'Modeling Agency', 'মডেলিং এজেন্সি'),
          d('CASTING_AGENCY', 'Casting Agency', 'কাস্টিং এজেন্সি'),
        ],
      },
    ],
  },
  {
    code: 'MUSIC',
    nameEn: 'Music',
    nameBn: 'সঙ্গীত',
    categories: [
      {
        code: 'MUSIC_COMPOSITION_LYRICS',
        nameEn: 'Composition & Lyrics',
        nameBn: 'সংগীত রচনা ও গীতি',
        designations: SOUND_COMPOSITION_LYRICS,
      },
      {
        code: 'MUSIC_VOCALS_PERFORMANCE',
        nameEn: 'Vocals & Performance',
        nameBn: 'কণ্ঠ ও পরিবেশনা',
        designations: SOUND_VOCALS_PERFORMANCE,
      },
      {
        code: 'MUSIC_SOUND_PRODUCTION',
        nameEn: 'Sound Production & Mixing',
        nameBn: 'সাউন্ড প্রযোজনা ও মিক্সিং',
        designations: SOUND_PRODUCTION_MIXING,
      },
      {
        code: 'MUSIC_INSTRUMENTALIST_MUSICIAN',
        nameEn: 'Instrumentalist & Musician',
        nameBn: 'বাদ্যযন্ত্র শিল্পী ও সংগীতজ্ঞ',
        designations: SOUND_INSTRUMENTALIST,
      },
    ],
  },
];

const t = (code: string, nameEn: string, nameBn: string): TaxonomyItem => ({
  code,
  nameEn,
  nameBn,
});

export const TAXONOMY_ORGANIZATION_TYPES: TaxonomyItem[] = [
  t('FILM_PRODUCTION_HOUSE', 'Film Production House', 'চলচ্চিত্র প্রযোজনা প্রতিষ্ঠান'),
  t('DRAMA_PRODUCTION_HOUSE', 'Drama Production House', 'নাটক প্রযোজনা প্রতিষ্ঠান'),
  t('TELEFILM_PRODUCTION_HOUSE', 'Telefilm Production House', 'টেলিফিল্ম প্রোডাকশন হাউস'),
  t('WEB_DRAMA_PRODUCTION_HOUSE', 'Web Drama Production House', 'ওয়েব নাটক প্রোডাকশন হাউস'),
  t('TVC_PRODUCTION_HOUSE', 'TVC Production House', 'টিভিসি প্রোডাকশন হাউস'),
  t('ADVERTISING_PRODUCTION_HOUSE', 'Advertising Production House', 'বিজ্ঞাপন নির্মাণ প্রতিষ্ঠান'),
  t('ADVERTISING_AGENCY', 'Advertising Agency', 'বিজ্ঞাপন সংস্থা'),
  t('VIDEO_PRODUCTION_COMPANY', 'Video Production Company', 'ভিডিও প্রোডাকশন কোম্পানি'),
  t('FILM_STUDIO', 'Film Studio', 'ফিল্ম স্টুডিও'),
  t('TELEVISION_CHANNEL', 'Television Channel', 'টিভি চ্যানেল'),
  t('POST_PRODUCTION_STUDIO', 'Post-Production Studio', 'পোস্ট-প্রোডাকশন স্টুডিও'),
  t('DUBBING_STUDIO', 'Dubbing Studio', 'ডাবিং স্টুডিও'),
  t('SOUND_STUDIO', 'Sound Studio', 'সাউন্ড স্টুডিও'),
  t('CAMERA_EQUIPMENT_RENTAL_HOUSE', 'Camera & Equipment Rental House', 'ক্যামেরা ও ইকুইপমেন্ট ভাড়া প্রতিষ্ঠান'),
  t('CASTING_AGENCY', 'Casting Agency', 'কাস্টিং এজেন্সি'),
  t('MODELING_AGENCY', 'Modeling Agency', 'মডেলিং এজেন্সি'),
  t('TALENT_MANAGEMENT_AGENCY', 'Talent Management Agency', 'ট্যালেন্ট ম্যানেজমেন্ট এজেন্সি'),
  t('VFX_ANIMATION_STUDIO', 'VFX & Animation Studio', 'VFX ও অ্যানিমেশন স্টুডিও'),
  t('PHOTOGRAPHY_STUDIO', 'Photography Studio', 'ফটোগ্রাফি স্টুডিও'),
  t('DIGITAL_MARKETING_AGENCY', 'Digital Marketing Agency', 'ডিজিটাল মার্কেটিং এজেন্সি'),
  t('EVENT_MEDIA_PRODUCTION_COMPANY', 'Event & Media Production Company', 'ইভেন্ট ও মিডিয়া প্রোডাকশন কোম্পানি'),
];

export const TAXONOMY_RENTAL_CATEGORIES: RentalTaxonomyCategory[] = [
  {
    code: 'VEHICLES',
    nameEn: 'Vehicles for Rent',
    nameBn: 'গাড়ি ও যানবাহন ভাড়া',
    subcategories: [
      t('CAR', 'Car', 'গাড়ি'),
      t('MOTORBIKE', 'Motorbike / Bicycle', 'মোটরসাইকেল / সাইকেল'),
      t('MICROBUS', 'Microbus', 'মাইক্রোবাস'),
      t('SHOOTING_VEHICLE', 'Shooting Vehicle', 'শুটিং যান'),
      t('PRODUCTION_VEHICLE', 'Production Vehicle', 'প্রোডাকশন যান'),
      t('PICKUP_TRANSPORT', 'Pickup / Transport Vehicle', 'পিকআপ/পরিবহন যান'),
      t('OTHER_VEHICLES', 'Other Vehicles', 'অন্যান্য যান'),
    ],
  },
  {
    code: 'LOCATIONS',
    nameEn: 'Shooting Locations & Properties',
    nameBn: 'শুটিং লোকেশন ও প্রপার্টি',
    subcategories: [
      t('SHOOTING_HOUSE', 'Shooting House', 'শুটিং হাউস'),
      t('SHOOTING_FLOOR', 'Shooting Floor', 'শুটিং ফ্লোর'),
      t('STUDIO_SPACE', 'Studio Space', 'স্টুডিও স্পেস'),
      t('RESORT', 'Resort', 'রিসোর্ট'),
      t('HOTEL', 'Hotel', 'হোটেল'),
      t('FARMHOUSE', 'Farmhouse', 'ফার্মহাউস'),
      t('ROOFTOP', 'Rooftop', 'ছাদ'),
      t('OFFICE_LOCATION', 'Office Location', 'অফিস লোকেশন'),
      t('RESIDENTIAL_HOUSE', 'Residential House', 'আবাসিক বাড়ি'),
      t('OUTDOOR_LOCATION', 'Outdoor Shooting Location', 'খোলা শুটিং লোকেশন'),
      t('OTHER_LOCATIONS', 'Other Shooting Locations', 'অন্যান্য লোকেশন'),
    ],
  },
  {
    code: 'CAMERA',
    nameEn: 'Camera & Video Equipment',
    nameBn: 'ক্যামেরা ও ভিডিও ইকুইপমেন্ট',
    subcategories: [
      t('CINEMA_CAMERA', 'Cinema Camera', 'সিনেমা ক্যামেরা'),
      t('DSLR_MIRRORLESS', 'DSLR / Mirrorless Camera', 'ডিএসএলআর/মিররলেস ক্যামেরা'),
      t('CAMERA_LENS', 'Camera Lens', 'ক্যামেরা লেন্স'),
      t('TRIPOD', 'Tripod', 'ট্রাইপড'),
      t('GIMBAL', 'Gimbal', 'জিম্বল'),
      t('DRONE', 'Drone', 'ড্রোন'),
      t('CAMERA_ACCESSORIES', 'Camera Accessories', 'ক্যামেরা এক্সেসরিজ'),
      t('OTHER_CAMERA', 'Other Camera Equipment', 'অন্যান্য ক্যামেরা ইকুইপমেন্ট'),
    ],
  },
  {
    code: 'LIGHTING',
    nameEn: 'Lighting Equipment',
    nameBn: 'লাইটিং ইকুইপমেন্ট',
    subcategories: [
      t('LED_LIGHT', 'LED Light', 'এলইডি লাইট'),
      t('SOFTBOX', 'Softbox', 'সফটবক্স'),
      t('SPOTLIGHT', 'Spotlight', 'স্পটলাইট'),
      t('STUDIO_LIGHT', 'Studio Light', 'স্টুডিও লাইট'),
      t('LIGHTING_STAND', 'Lighting Stand', 'লাইটিং স্ট্যান্ড'),
      t('LIGHTING_ACCESSORIES', 'Lighting Accessories', 'লাইটিং এক্সেসরিজ'),
      t('OTHER_LIGHTING', 'Other Lighting Equipment', 'অন্যান্য লাইটিং ইকুইপমেন্ট'),
    ],
  },
  {
    code: 'SOUND',
    nameEn: 'Sound Equipment',
    nameBn: 'সাউন্ড ইকুইপমেন্ট',
    subcategories: [
      t('MICROPHONE', 'Microphone', 'মাইক্রোফোন'),
      t('BOOM_MICROPHONE', 'Boom Microphone', 'বুম মাইক্রোফোন'),
      t('WIRELESS_MICROPHONE', 'Wireless Microphone', 'ওয়্যারলেস মাইক্রোফোন'),
      t('AUDIO_RECORDER', 'Audio Recorder', 'অডিও রেকর্ডার'),
      t('MIXER', 'Mixer', 'মিক্সার'),
      t('SPEAKER', 'Speaker', 'স্পিকার'),
      t('SOUND_SYSTEM', 'Sound System', 'সাউন্ড সিস্টেম'),
      t('OTHER_SOUND', 'Other Sound Equipment', 'অন্যান্য সাউন্ড ইকুইপমেন্ট'),
    ],
  },
  {
    code: 'PRODUCTION',
    nameEn: 'Production Equipment & Props',
    nameBn: 'প্রোডাকশন ইকুইপমেন্ট ও প্রপস',
    subcategories: [
      t('GENERATOR', 'Generator', 'জেনারেটর'),
      t('MONITOR', 'Monitor', 'মনিটর'),
      t('GRIP_EQUIPMENT', 'Grip Equipment', 'গ্রিপ ইকুইপমেন্ট'),
      t('SET_PROPS', 'Set Props', 'সেট প্রপস'),
      t('PROP_WEAPONS', 'Prop Weapons & Armoury (film props only)', 'প্রপ অস্ত্র ও আর্মারি (শুধু শুটিং প্রপ)'),
      t('FURNITURE', 'Furniture', 'আসবাব'),
      t('COSTUME', 'Costume', 'কস্টিউম'),
      t('MAKEUP_EQUIPMENT', 'Makeup Equipment', 'মেকআপ ইকুইপমেন্ট'),
      t('PRODUCTION_ACCESSORIES', 'Production Accessories', 'প্রোডাকশন এক্সেসরিজ'),
      t('OTHER_PRODUCTION', 'Other Production Equipment', 'অন্যান্য প্রোডাকশন ইকুইপমেন্ট'),
    ],
  },
  {
    code: 'OTHER',
    nameEn: 'Other Rental Services',
    nameBn: 'অন্যান্য ভাড়া সার্ভিস',
    subcategories: [t('OTHER_SERVICES', 'Other', 'অন্যান্য')],
  },
];
