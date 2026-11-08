export const APP_NAME = 'Twingface';
export const APP_DESCRIPTION = 'A modern social media platform';

export const ROUTES = {
  home: '/',
  login: '/login',
  register: '/register',
  dashboard: '/dashboard',
} as const;

export const LIMITS = {
  maxPostLength: 500,
  maxImageSize: 5 * 1024 * 1024,
  postsPerPage: 20,
  maxUploadSize: 10 * 1024 * 1024,
} as const;

export const GENDERS = ['Male', 'Female', 'Others'] as const;
export type Gender = (typeof GENDERS)[number];

export const DIVISIONS = [
  'Dhaka',
  'Chattogram',
  'Khulna',
  'Rajshahi',
  'Rangpur',
  'Barishal',
  'Sylhet',
  'Mymensingh',
] as const;
export type Division = (typeof DIVISIONS)[number];

export const DISTRICTS_BY_DIVISION: Record<Division, readonly string[]> = {
  Dhaka: [
    'Dhaka',
    'Faridpur',
    'Gazipur',
    'Gopalganj',
    'Kishoreganj',
    'Madaripur',
    'Manikganj',
    'Munshiganj',
    'Narayanganj',
    'Narsingdi',
    'Rajbari',
    'Shariatpur',
    'Tangail',
  ],
  Chattogram: [
    'Bandarban',
    'Brahmanbaria',
    'Chandpur',
    'Chattogram',
    'Cumilla',
    "Cox's Bazar",
    'Feni',
    'Khagrachari',
    'Lakshmipur',
    'Noakhali',
    'Rangamati',
  ],
  Khulna: ['Bagerhat', 'Chuadanga', 'Jashore', 'Jhenaidah', 'Khulna', 'Kushtia', 'Magura', 'Meherpur', 'Narail', 'Satkhira'],
  Rajshahi: ['Bogura', 'Joypurhat', 'Naogaon', 'Natore', 'Chapai Nawabganj', 'Pabna', 'Rajshahi', 'Sirajganj'],
  Rangpur: ['Dinajpur', 'Gaibandha', 'Kurigram', 'Lalmonirhat', 'Nilphamari', 'Panchagarh', 'Rangpur', 'Thakurgaon'],
  Barishal: ['Barguna', 'Barishal', 'Bhola', 'Jhalokati', 'Patuakhali', 'Pirojpur'],
  Sylhet: ['Habiganj', 'Moulvibazar', 'Sunamganj', 'Sylhet'],
  Mymensingh: ['Jamalpur', 'Mymensingh', 'Netrakona', 'Sherpur'],
} as const;

export const ALL_DISTRICTS: readonly string[] = Object.values(DISTRICTS_BY_DIVISION).flat();

export const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

export const MIN_DOB_YEAR = 1950;

export const PAGE_CATEGORIES = [
  'Business',
  'Brand',
  'Community',
  'Creator',
  'Entertainment',
  'Health & wellness',
  'Education',
  'Nonprofit',
  'Personal blog',
  'Other',
] as const;

export function districtsForDivision(division: string): readonly string[] {
  return (DISTRICTS_BY_DIVISION as Record<string, readonly string[]>)[division] ?? [];
}
