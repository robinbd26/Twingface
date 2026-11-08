import { describe, expect, it } from 'vitest';
import { describeConflict, findOverlapping, overlapping, rangesOverlap } from './availability';

const range = (startAt: string, endAt: string) => ({ startAt, endAt });

describe('booking overlap rules', () => {
  it('treats touching ranges as free, not as a conflict', () => {
    expect(rangesOverlap(range('2026-11-01T00:00:00Z', '2026-11-02T00:00:00Z'), range('2026-11-02T00:00:00Z', '2026-11-03T00:00:00Z'))).toBe(false);
    expect(rangesOverlap(range('2026-11-02T00:00:00Z', '2026-11-03T00:00:00Z'), range('2026-11-01T00:00:00Z', '2026-11-02T00:00:00Z'))).toBe(false);
  });

  it('detects partial overlap, containment and identical ranges', () => {
    const existing = range('2026-11-02T00:00:00Z', '2026-11-05T00:00:00Z');
    expect(rangesOverlap(existing, range('2026-11-04T00:00:00Z', '2026-11-06T00:00:00Z'))).toBe(true);
    expect(rangesOverlap(existing, range('2026-11-03T00:00:00Z', '2026-11-03T12:00:00Z'))).toBe(true);
    expect(rangesOverlap(existing, range('2026-11-01T00:00:00Z', '2026-11-09T00:00:00Z'))).toBe(true);
    expect(rangesOverlap(existing, range('2026-11-02T00:00:00Z', '2026-11-05T00:00:00Z'))).toBe(true);
  });

  it('accepts Date objects and ISO strings interchangeably', () => {
    expect(rangesOverlap({ startAt: new Date('2026-11-02T00:00:00Z'), endAt: new Date('2026-11-05T00:00:00Z') }, range('2026-11-04T00:00:00Z', '2026-11-06T00:00:00Z'))).toBe(true);
  });

  it('ignores unparseable ranges instead of blocking the slot', () => {
    expect(rangesOverlap({ startAt: 'not-a-date', endAt: '2026-11-05T00:00:00Z' }, range('2026-11-04T00:00:00Z', '2026-11-06T00:00:00Z'))).toBe(false);
  });

  it('picks the first conflicting range and lists all of them', () => {
    const ranges = [
      range('2026-10-01T00:00:00Z', '2026-10-02T00:00:00Z'),
      range('2026-11-02T00:00:00Z', '2026-11-04T00:00:00Z'),
      range('2026-11-03T00:00:00Z', '2026-11-06T00:00:00Z'),
    ];
    expect(findOverlapping(ranges, '2026-11-01T00:00:00Z', '2026-11-05T00:00:00Z')).toBe(ranges[1]);
    expect(findOverlapping(ranges, '2026-11-07T00:00:00Z', '2026-11-09T00:00:00Z')).toBeNull();
    expect(overlapping(ranges, '2026-11-01T00:00:00Z', '2026-11-05T00:00:00Z')).toHaveLength(2);
  });

  it('explains the two kinds of conflict', () => {
    expect(describeConflict({ kind: 'block', startAt: '2026-11-01T00:00:00Z', endAt: '2026-11-02T00:00:00Z' })).toBe('The provider blocked these dates.');
    expect(describeConflict({ kind: 'booking', startAt: '2026-11-01T00:00:00Z', endAt: '2026-11-02T00:00:00Z' })).toBe('Another booking is already confirmed.');
  });
});
