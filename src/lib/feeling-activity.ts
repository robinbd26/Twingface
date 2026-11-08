import { z } from 'zod';

export const FEELING_ACTIVITY_OPTIONS = [
  { key: 'feeling:happy', kind: 'feeling', label: 'Happy', emoji: '😊', phrase: 'is feeling happy' },
  { key: 'feeling:sad', kind: 'feeling', label: 'Sad', emoji: '😢', phrase: 'is feeling sad' },
  { key: 'feeling:excited', kind: 'feeling', label: 'Excited', emoji: '🤩', phrase: 'is feeling excited' },
  { key: 'feeling:loved', kind: 'feeling', label: 'Loved', emoji: '❤️', phrase: 'is feeling loved' },
  { key: 'feeling:thankful', kind: 'feeling', label: 'Thankful', emoji: '🙏', phrase: 'is feeling thankful' },
  { key: 'feeling:angry', kind: 'feeling', label: 'Angry', emoji: '😠', phrase: 'is feeling angry' },
  { key: 'feeling:blessed', kind: 'feeling', label: 'Blessed', emoji: '😇', phrase: 'is feeling blessed' },
  { key: 'feeling:tired', kind: 'feeling', label: 'Tired', emoji: '😴', phrase: 'is feeling tired' },
  { key: 'activity:watching', kind: 'activity', label: 'Watching', emoji: '🎬', phrase: 'is watching' },
  { key: 'activity:listening', kind: 'activity', label: 'Listening to', emoji: '🎧', phrase: 'is listening to' },
  { key: 'activity:playing', kind: 'activity', label: 'Playing', emoji: '🎮', phrase: 'is playing' },
  { key: 'activity:traveling', kind: 'activity', label: 'Traveling to', emoji: '✈️', phrase: 'is traveling to' },
  { key: 'activity:eating', kind: 'activity', label: 'Eating', emoji: '🍽️', phrase: 'is eating' },
  { key: 'activity:reading', kind: 'activity', label: 'Reading', emoji: '📖', phrase: 'is reading' },
  { key: 'activity:celebrating', kind: 'activity', label: 'Celebrating', emoji: '🎉', phrase: 'is celebrating' },
  { key: 'activity:working', kind: 'activity', label: 'Working', emoji: '💼', phrase: 'is working' },
] as const;

export type FeelingActivityOption = (typeof FEELING_ACTIVITY_OPTIONS)[number];
export type FeelingActivityKey = FeelingActivityOption['key'];

const FEELING_ACTIVITY_KEYS = new Set<string>(FEELING_ACTIVITY_OPTIONS.map((option) => option.key));

export const FeelingActivityKeySchema = z.preprocess(
  (value) => (typeof value === 'string' ? value.trim() || null : value ?? null),
  z.string().refine((value) => FEELING_ACTIVITY_KEYS.has(value), 'Choose a valid feeling or activity.').nullable(),
);

export function getFeelingActivity(key: string | null | undefined): FeelingActivityOption | null {
  return FEELING_ACTIVITY_OPTIONS.find((option) => option.key === key) ?? null;
}
