import { describe, expect, it } from 'vitest';
import {
  CreatePagePostSchema,
  CreatePageSchema,
  CreatePostSchema,
  CreateCommentSchema,
  CreateGroupSchema,
  loginSchema,
  mediaWorldPersonalSchema,
  mediaWorldSignupSchema,
  normalizeContact,
  parseLoginIdentifier,
  ProfileSchema,
  profileUpdateSchema,
  registerSchema,
  rentalSignupSchema,
  UpdateBioSchema,
  UpdatePageSchema,
  UpdateProfileDetailsSchema,
  UpdatePostSchema,
  UpdateGroupSchema,
  GroupMemberActionSchema,
  validateContact,
} from './validations';

const registration = {
  name: 'Farah Rahman',
  username: 'farah.rahman',
  contact: ' FARAH@example.COM ',
  gender: 'Female',
  dobDay: 15,
  dobMonth: 5,
  dobYear: 1998,
  division: 'Dhaka',
  district: 'Dhaka',
  password: 'StrongPass123',
  confirmPassword: 'StrongPass123',
};

describe('registerSchema', () => {
  it('accepts and normalizes a complete registration', () => {
    const result = registerSchema.parse(registration);
    expect(result.contact).toBe('FARAH@example.COM');
  });

  it('accepts an 8-character password with upper, lower, and numeric characters', () => {
    const result = registerSchema.safeParse({ ...registration, password: 'Abcdef1!', confirmPassword: 'Abcdef1!' });
    expect(result.success).toBe(true);
  });

  it.each(['0171234567', '01712345678', '880'])('rejects phone-shaped User ID %s so it cannot become ambiguous at login', (username) => {
    expect(registerSchema.safeParse({ ...registration, username }).success).toBe(false);
  });

  it('accepts a Bangladeshi mobile number as contact', () => {
    const result = registerSchema.safeParse({ ...registration, contact: '01712345678' });
    expect(result.success).toBe(true);
  });

  it('accepts a simplified payload without demographic details', () => {
    const result = registerSchema.safeParse({
      name: registration.name,
      username: registration.username,
      contact: registration.contact,
      password: registration.password,
      confirmPassword: registration.confirmPassword,
    });
    expect(result.success).toBe(true);
  });

  it('rejects mismatched division and district', () => {
    expect(registerSchema.safeParse({ ...registration, division: 'Dhaka', district: 'Sylhet' }).success).toBe(false);
  });

  it('rejects an invalid date of birth and underage users', () => {
    expect(registerSchema.safeParse({ ...registration, dobDay: 30, dobMonth: 2, dobYear: 2000 }).success).toBe(false);
    expect(registerSchema.safeParse({ ...registration, dobYear: new Date().getFullYear() - 10 }).success).toBe(false);
  });

  it('rejects unexpectedly large credential fields before database access', () => {
    const huge = 'a'.repeat(10_000);
    expect(registerSchema.safeParse({ ...registration, contact: `${huge}@example.com` }).success).toBe(false);
    expect(registerSchema.safeParse({ ...registration, password: `${huge}A1`, confirmPassword: `${huge}A1` }).success).toBe(false);
    expect(loginSchema.safeParse({ identifier: 'farah@example.com', password: huge }).success).toBe(false);
  });

  it.each([
    ['not-an-email', 'contact'],
    ['short1A', 'password'],
    ['StrongPass123', 'confirmPassword'],
    ['StrongPass123', 'username'],
    ['StrongPass123', 'name'],
    ['Unknown', 'gender'],
    ['Dhaka', 'district'],
  ])('rejects invalid %s input', (value, field) => {
    const candidate = { ...registration };
    if (field === 'contact') candidate.contact = value;
    if (field === 'password') candidate.password = value;
    if (field === 'confirmPassword') candidate.confirmPassword = 'Mismatch1234';
    if (field === 'username') candidate.username = 'bad user';
    if (field === 'name') candidate.name = 'F';
    if (field === 'gender') candidate.gender = value;
    if (field === 'district') {
      candidate.division = 'Sylhet';
      candidate.district = value;
    }
    expect(registerSchema.safeParse(candidate).success).toBe(false);
  });
});

describe('contact helpers', () => {
  it('normalizes email and Bangladeshi mobile numbers', () => {
    expect(normalizeContact(' Test@Example.com ')).toEqual({ email: 'test@example.com', phone: null });
    expect(normalizeContact('01712345678')).toEqual({ email: null, phone: '+8801712345678' });
  });

  it('validates email and mobile formats', () => {
    expect(validateContact('user@example.com')).toBe(true);
    expect(validateContact('01712345678')).toBe(true);
    expect(validateContact('not-a-contact')).toBe(false);
  });
});

describe('loginSchema', () => {
  it('classifies normalized email, phone, and User ID credentials', () => {
    expect(parseLoginIdentifier(' FARAH@EXAMPLE.COM ')).toEqual({ kind: 'email', value: 'farah@example.com' });
    expect(parseLoginIdentifier('01712 345678')).toEqual({ kind: 'phone', value: '+8801712345678' });
    expect(parseLoginIdentifier(' Farah.Rahman ')).toEqual({ kind: 'username', value: 'farah.rahman' });
  });

  it('returns the classified identifier in the login schema result', () => {
    expect(loginSchema.parse({ identifier: ' FARAH@EXAMPLE.COM ', password: 'StrongPass123' }).identifier).toEqual({
      kind: 'email',
      value: 'farah@example.com',
    });
  });

  it.each(['not an email@example', '0171234567', 'bad user', '.starts-with-punctuation'])('rejects malformed login identifier %s', (identifier) => {
    expect(parseLoginIdentifier(identifier)).toBeNull();
    expect(loginSchema.safeParse({ identifier, password: 'StrongPass123' }).success).toBe(false);
  });
});

describe('profileUpdateSchema', () => {
  const profile = { name: 'Farah Rahman', username: 'farah.rahman', bio: 'Hello', profileImage: 'https://example.com/avatar.jpg', coverImage: 'https://example.com/cover.jpg' };

  it('accepts safe HTTPS image URLs and normalizes empty optional values', () => {
    expect(profileUpdateSchema.parse(profile).profileImage).toBe('https://example.com/avatar.jpg');
    expect(profileUpdateSchema.parse({ ...profile, bio: ' ', profileImage: '', coverImage: '' })).toMatchObject({ bio: null, profileImage: null, coverImage: null });
  });

  it.each(['http://example.com/image.jpg', 'data:image/png;base64,abc', 'javascript:alert(1)', 'not a url'])('rejects unsafe image URL %s', (url) => {
    expect(profileUpdateSchema.safeParse({ ...profile, profileImage: url }).success).toBe(false);
  });

  it('rejects a bio longer than 500 characters', () => {
    expect(profileUpdateSchema.safeParse({ ...profile, bio: 'x'.repeat(501) }).success).toBe(false);
  });
});

it('exports ProfileSchema as the compatible profile validator', () => {
  expect(ProfileSchema).toBe(profileUpdateSchema);
});

describe('profile intro update schemas', () => {
  it('normalizes trimmed bio and details values while treating whitespace as empty', () => {
    expect(UpdateBioSchema.parse({ bio: '  Building useful things in Dhaka.  ' })).toEqual({ bio: 'Building useful things in Dhaka.' });
    expect(UpdateBioSchema.parse({ bio: '   ' })).toEqual({ bio: null });
    expect(UpdateProfileDetailsSchema.parse({
      profession: '  Engineer  ',
      education: '  Dhaka University ',
      currentCity: ' Dhaka ',
      hometown: '  Khulna  ',
    })).toEqual({ profession: 'Engineer', education: 'Dhaka University', currentCity: 'Dhaka', hometown: 'Khulna' });
    expect(UpdateProfileDetailsSchema.parse({ profession: ' ', education: '', currentCity: '  ', hometown: '' })).toEqual({
      profession: null,
      education: null,
      currentCity: null,
      hometown: null,
    });
  });

  it.each([
    ['bio', { bio: 'x'.repeat(501) }],
    ['profession', { profession: 'x'.repeat(101), education: '', currentCity: '', hometown: '' }],
    ['education', { profession: '', education: 'x'.repeat(161), currentCity: '', hometown: '' }],
    ['currentCity', { profession: '', education: '', currentCity: 'x'.repeat(121), hometown: '' }],
    ['hometown', { profession: '', education: '', currentCity: '', hometown: 'x'.repeat(121) }],
  ])('rejects an overlong %s value', (_field, value) => {
    const schema = 'bio' in value ? UpdateBioSchema : UpdateProfileDetailsSchema;
    expect(schema.safeParse(value).success).toBe(false);
  });

  it.each([
    [UpdateBioSchema, { bio: 'Hello', id: 'other-user' }],
    [UpdateBioSchema, { bio: 'Hello', passwordHash: 'secret' }],
    [UpdateProfileDetailsSchema, { profession: '', education: '', currentCity: '', hometown: '', profileImage: 'https://attacker.example/x.jpg' }],
  ])('rejects protected or unknown profile fields', (schema, value) => {
    expect(schema.safeParse(value).success).toBe(false);
  });
});

describe('post schemas', () => {
  it('trims valid post content', () => {
    expect(CreatePostSchema.parse({ content: '  Hello Twingface  ' })).toEqual({ content: 'Hello Twingface' });
  });

  it('keeps JSON post creation non-empty and rejects oversized content', () => {
    expect(CreatePostSchema.safeParse({}).success).toBe(false);
    expect(UpdatePostSchema.safeParse({ content: 'x'.repeat(501) }).success).toBe(false);
  });
});

describe('CreateCommentSchema', () => {
  it('trims a valid comment before persistence', () => {
    expect(CreateCommentSchema.parse({ content: '  Great post!  ' })).toEqual({ content: 'Great post!' });
  });

  it('rejects whitespace-only and oversized comments', () => {
    expect(CreateCommentSchema.safeParse({ content: '   ' }).success).toBe(false);
    expect(CreateCommentSchema.safeParse({ content: 'x'.repeat(501) }).success).toBe(false);
  });
});

describe('page schemas', () => {
  it('normalizes page names and handles on creation', () => {
    expect(CreatePageSchema.parse({ name: ' Remote Job BD ', handle: ' RemoteJob.BD ', category: 'Community', bio: ' ' })).toEqual({
      name: 'Remote Job BD',
      handle: 'remotejob.bd',
      category: 'Community',
      bio: null,
    });
  });

  it('rejects unknown categories and invalid handles on updates', () => {
    expect(UpdatePageSchema.safeParse({ name: 'Remote Job BD', handle: 'remotejob.bd', category: 'Nope', bio: null }).success).toBe(false);
    expect(UpdatePageSchema.safeParse({ name: 'Remote Job BD', handle: '-bad-', category: 'Community', bio: null }).success).toBe(false);
  });

  it('strips protected fields instead of mass-assigning them', () => {
    const parsed = UpdatePageSchema.parse({ name: 'Remote Job BD', handle: 'remotejob.bd', category: 'Community', bio: '', ownerId: 'someone-else' });
    expect(parsed).not.toHaveProperty('ownerId');
  });

  it('requires non-empty page post content within limits', () => {
    expect(CreatePagePostSchema.parse({ content: '  Hello fans  ' })).toEqual({ content: 'Hello fans' });
    expect(CreatePagePostSchema.safeParse({ content: '   ' }).success).toBe(false);
    expect(CreatePagePostSchema.safeParse({ content: 'x'.repeat(501) }).success).toBe(false);
  });
});

describe('group schemas', () => {
  const validGroup = {
    name: '  Dhaka Developers  ',
    handle: ' Dhaka-Devs ',
    description: ' A community for builders. ',
    privacy: 'PRIVATE',
    postingPolicy: 'ADMINS_ONLY',
    coverImage: 'https://images.example.com/group.jpg',
  };

  it('normalizes safe group creation fields', () => {
    expect(CreateGroupSchema.parse(validGroup)).toEqual({
      name: 'Dhaka Developers',
      handle: 'dhaka-devs',
      description: 'A community for builders.',
      privacy: 'PRIVATE',
      postingPolicy: 'ADMINS_ONLY',
      coverImage: 'https://images.example.com/group.jpg',
    });
  });

  it.each([
    { ...validGroup, name: 'Hi' },
    { ...validGroup, name: 'x'.repeat(81) },
    { ...validGroup, handle: '-unsafe-' },
    { ...validGroup, handle: 'x'.repeat(61) },
    { ...validGroup, privacy: 'SECRET' },
    { ...validGroup, postingPolicy: 'EVERYONE' },
    { ...validGroup, coverImage: 'http://images.example.com/group.jpg' },
  ])('rejects invalid group creation input', (input) => {
    expect(CreateGroupSchema.safeParse(input).success).toBe(false);
  });

  it('updates only supported fields and rejects unsupported membership actions', () => {
    expect(UpdateGroupSchema.parse({ name: validGroup.name, description: ' ', privacy: validGroup.privacy, postingPolicy: validGroup.postingPolicy, coverImage: validGroup.coverImage }).description).toBeNull();
    expect(UpdateGroupSchema.safeParse({ handle: 'attempted-rename' }).success).toBe(false);
    expect(GroupMemberActionSchema.safeParse({ action: 'approve' }).success).toBe(true);
    expect(GroupMemberActionSchema.safeParse({ action: 'promote-admin' }).success).toBe(false);
  });
});

describe('mediaWorldSignupSchema', () => {
  const signup = {
    name: '  Farah Rahman ',
    email: ' FARAH@example.COM ',
    phone: '01712-345678',
    password: 'StrongPass123',
    confirmPassword: 'StrongPass123',
    division: 'Dhaka',
    district: 'Dhaka',
    presentAddress: ' House 12, Road 5, Dhanmondi ',
  };

  it('normalizes signup details and the mobile number', () => {
    const result = mediaWorldSignupSchema.parse(signup);
    expect(result).toEqual({
      name: 'Farah Rahman',
      email: 'farah@example.com',
      phone: '+8801712345678',
      password: 'StrongPass123',
      confirmPassword: 'StrongPass123',
      division: 'Dhaka',
      district: 'Dhaka',
      presentAddress: 'House 12, Road 5, Dhanmondi',
    });
  });

  it('keeps +880 numbers and prefixes bare 880 numbers', () => {
    expect(mediaWorldSignupSchema.parse({ ...signup, phone: '+8801912345678' }).phone).toBe('+8801912345678');
    expect(mediaWorldSignupSchema.parse({ ...signup, phone: '8801812345678' }).phone).toBe('+8801812345678');
  });

  it.each([
    { ...signup, phone: '01234' },
    { ...signup, phone: '+8801212345678' },
    { ...signup, password: 'weakpass' },
    { ...signup, confirmPassword: 'StrongPass124' },
    { ...signup, division: 'Atlantis' },
    { ...signup, district: 'Sylhet' },
    { ...signup, presentAddress: 'abc' },
    { ...signup, permanentAddress: 'Village Char, Upazila Sadar' },
    { ...signup, username: 'sneaky' },
  ])('rejects invalid signup input', (input) => {
    expect(mediaWorldSignupSchema.safeParse(input).success).toBe(false);
  });

  it('reports the district mismatch on the district field', () => {
    const result = mediaWorldSignupSchema.safeParse({ ...signup, district: 'Sylhet' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.district).toContain('District does not belong to the selected division.');
    }
  });

  it('treats the bio as optional and normalizes a blank one', () => {
    expect(mediaWorldSignupSchema.safeParse(signup).success).toBe(true);
    expect(mediaWorldSignupSchema.parse({ ...signup, bio: '  Stage and screen actor ' }).bio).toBe('Stage and screen actor');
    expect(mediaWorldSignupSchema.parse({ ...signup, bio: '   ' }).bio).toBeNull();
    expect(mediaWorldSignupSchema.safeParse({ ...signup, bio: 'a'.repeat(501) }).success).toBe(false);
  });
});

describe('rentalSignupSchema', () => {
  const rental = {
    name: '  Jahangir Alam ',
    email: 'JAHANGIR@EXAMPLE.COM ',
    phone: '01712 345678',
    password: 'StrongPass123',
    confirmPassword: 'StrongPass123',
    division: 'Dhaka',
    district: 'Dhaka',
    presentAddress: ' House 12, Road 5, Dhanmondi ',
    ownerName: ' Jahangir Alam ',
    location: '  Dhanmondi, Dhaka ',
    description: '  Lighting rigs and generators for rent. ',
  };

  it('normalizes the login details and the rental service in one pass', () => {
    expect(rentalSignupSchema.parse(rental)).toEqual({
      name: 'Jahangir Alam',
      email: 'jahangir@example.com',
      phone: '+8801712345678',
      password: 'StrongPass123',
      confirmPassword: 'StrongPass123',
      division: 'Dhaka',
      district: 'Dhaka',
      presentAddress: 'House 12, Road 5, Dhanmondi',
      ownerName: 'Jahangir Alam',
      location: 'Dhanmondi, Dhaka',
      description: 'Lighting rigs and generators for rent.',
    });
  });

  it('keeps the optional business name and full address trimmed', () => {
    const result = rentalSignupSchema.parse({
      ...rental,
      businessName: '  Camera Bazar ',
      fullAddress: ' Road 27, Block D ',
    });
    expect(result.businessName).toBe('Camera Bazar');
    expect(result.fullAddress).toBe('Road 27, Block D');
  });

  it('treats a blank optional as absent instead of an empty string', () => {
    const result = rentalSignupSchema.parse({ ...rental, businessName: '   ', fullAddress: '' });
    expect(result.businessName).toBeUndefined();
    expect(result.fullAddress).toBeUndefined();
  });

  it.each([
    { ...rental, ownerName: 'J' },
    { ...rental, location: ' ' },
    { ...rental, description: 'too short' },
    { ...rental, description: 'a'.repeat(2001) },
    { ...rental, businessName: 'a'.repeat(161) },
    { ...rental, confirmPassword: 'StrongPass124' },
    { ...rental, district: 'Sylhet' },
    { ...rental, bio: 'rentals are not a profession' },
  ])('rejects an incomplete or invented rental signup', (input) => {
    expect(rentalSignupSchema.safeParse(input).success).toBe(false);
  });

  it('reports the service fields on their own paths', () => {
    const result = rentalSignupSchema.safeParse({ ...rental, location: ' ' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.location).toContain('Service location is required.');
    }
  });
});

describe('mediaWorldPersonalSchema', () => {
  const personal = {
    name: 'Farah Rahman',
    email: 'farah@example.com',
    phone: '01712345678',
    division: 'Sylhet',
    district: 'Sylhet',
    presentAddress: 'House 4, Zindabazar',
  };

  it('ignores credentials and accepts a complete personal record', () => {
    const result = mediaWorldPersonalSchema.safeParse({ ...personal, password: 'NotAllowed123' });
    expect(result.success).toBe(false);
    expect(mediaWorldPersonalSchema.parse(personal).phone).toBe('+8801712345678');
  });

  it('requires an address within the selected division', () => {
    expect(mediaWorldPersonalSchema.safeParse({ ...personal, district: 'Dhaka' }).success).toBe(false);
  });

  it('accepts an optional bio and rejects one over the limit', () => {
    expect(mediaWorldPersonalSchema.parse({ ...personal, bio: '  Theatre actor ' }).bio).toBe('Theatre actor');
    expect(mediaWorldPersonalSchema.parse({ ...personal, bio: '' }).bio).toBeNull();
    expect(mediaWorldPersonalSchema.safeParse({ ...personal, bio: 'a'.repeat(501) }).success).toBe(false);
  });
});
