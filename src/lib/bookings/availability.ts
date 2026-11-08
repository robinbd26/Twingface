/** Half-open ranges: a booking ending at 10:00 frees the slot for one starting at 10:00. */
export type TimeRange = { startAt: Date | string; endAt: Date | string };

export function toMillis(value: Date | string): number {
  return value instanceof Date ? value.getTime() : Date.parse(value);
}

export function rangesOverlap(a: TimeRange, b: TimeRange): boolean {
  const aStart = toMillis(a.startAt);
  const aEnd = toMillis(a.endAt);
  const bStart = toMillis(b.startAt);
  const bEnd = toMillis(b.endAt);
  if (![aStart, aEnd, bStart, bEnd].every(Number.isFinite)) return false;
  return aStart < bEnd && bStart < aEnd;
}

export function findOverlapping<T extends TimeRange>(ranges: T[], startAt: Date | string, endAt: Date | string): T | null {
  const probe = { startAt, endAt };
  return ranges.find((range) => rangesOverlap(range, probe)) ?? null;
}

export function overlapping<T extends TimeRange>(ranges: T[], startAt: Date | string, endAt: Date | string): T[] {
  const probe = { startAt, endAt };
  return ranges.filter((range) => rangesOverlap(range, probe));
}

/** Only confirmed bookings and provider blocks remove a slot; pending requests stay advisory. */
export type SlotSource = 'booking' | 'block';

export type SlotConflict = {
  kind: SlotSource;
  startAt: string;
  endAt: string;
};

export function describeConflict(conflict: SlotConflict): string {
  return conflict.kind === 'block' ? 'The provider blocked these dates.' : 'Another booking is already confirmed.';
}
