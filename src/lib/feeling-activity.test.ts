import { describe, expect, it } from 'vitest';
import { FEELING_ACTIVITY_OPTIONS, FeelingActivityKeySchema, getFeelingActivity } from './feeling-activity';

describe('feeling and activity catalog', () => {
  it('contains the approved eight feelings and eight activities', () => {
    expect(FEELING_ACTIVITY_OPTIONS.filter((option) => option.kind === 'feeling')).toHaveLength(8);
    expect(FEELING_ACTIVITY_OPTIONS.filter((option) => option.kind === 'activity')).toHaveLength(8);
  });

  it('resolves stable display metadata for supported catalog keys', () => {
    expect(getFeelingActivity('feeling:happy')).toMatchObject({
      key: 'feeling:happy',
      kind: 'feeling',
      label: 'Happy',
      emoji: '😊',
      phrase: 'is feeling happy',
    });
    expect(getFeelingActivity('activity:watching')).toMatchObject({
      key: 'activity:watching',
      kind: 'activity',
      label: 'Watching',
      emoji: '🎬',
      phrase: 'is watching',
    });
  });

  it('normalizes omitted and empty values to null', () => {
    expect(FeelingActivityKeySchema.parse(undefined)).toBeNull();
    expect(FeelingActivityKeySchema.parse('')).toBeNull();
  });

  it('rejects an unknown feeling key', () => {
    expect(FeelingActivityKeySchema.safeParse('feeling:admin').success).toBe(false);
    expect(getFeelingActivity('feeling:admin')).toBeNull();
  });
});
