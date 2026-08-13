import { describe, expect, it } from 'vitest';
import {
  calculateAvailableSlots,
  minutesToTime,
  rangesOverlap,
  timeToMinutes,
} from './slots.js';
import type { WorkingHours } from '../types.js';

const weekdayHours = (overrides: Partial<WorkingHours> = {}): WorkingHours => ({
  id: 1,
  weekday: 1,
  start_time: '10:00',
  end_time: '20:00',
  active: 1,
  ...overrides,
});

describe('time helpers', () => {
  it('converts time strings to minutes and back', () => {
    expect(timeToMinutes('10:00')).toBe(600);
    expect(timeToMinutes('14:30')).toBe(870);
    expect(minutesToTime(870)).toBe('14:30');
  });

  it('detects overlapping ranges', () => {
    expect(rangesOverlap(600, 660, 630, 690)).toBe(true);
    expect(rangesOverlap(600, 660, 660, 720)).toBe(false);
    expect(rangesOverlap(600, 660, 540, 600)).toBe(false);
  });
});

describe('calculateAvailableSlots', () => {
  it('returns empty list for inactive working day', () => {
    const slots = calculateAvailableSlots({
      date: '2026-08-16',
      durationMinutes: 60,
      workingHours: weekdayHours({ active: 0 }),
      busyIntervals: [],
      now: new Date(2026, 7, 12, 9, 0, 0),
    });
    expect(slots).toEqual([]);
  });

  it('generates slots within working hours for service duration', () => {
    const slots = calculateAvailableSlots({
      date: '2026-08-17',
      durationMinutes: 60,
      workingHours: weekdayHours(),
      busyIntervals: [],
      now: new Date(2026, 7, 12, 9, 0, 0),
      stepMinutes: 30,
    });

    expect(slots[0]).toBe('10:00');
    expect(slots).toContain('19:00');
    expect(slots).not.toContain('19:30');
    expect(slots).not.toContain('20:00');
  });

  it('excludes slots overlapping existing appointments', () => {
    const slots = calculateAvailableSlots({
      date: '2026-08-17',
      durationMinutes: 60,
      workingHours: weekdayHours(),
      busyIntervals: [{ start_time: '11:00', end_time: '12:00' }],
      now: new Date(2026, 7, 12, 9, 0, 0),
      stepMinutes: 30,
    });

    expect(slots).not.toContain('10:30');
    expect(slots).not.toContain('11:00');
    expect(slots).not.toContain('11:30');
    expect(slots).toContain('10:00');
    expect(slots).toContain('12:00');
  });

  it('only returns future slots for today', () => {
    const slots = calculateAvailableSlots({
      date: '2026-08-12',
      durationMinutes: 60,
      workingHours: weekdayHours(),
      busyIntervals: [],
      now: new Date(2026, 7, 12, 14, 5, 0),
      stepMinutes: 30,
    });

    expect(slots).not.toContain('14:00');
    expect(slots).toContain('14:30');
    expect(slots).toContain('15:00');
  });

  it('returns no slots for past dates', () => {
    const slots = calculateAvailableSlots({
      date: '2026-08-10',
      durationMinutes: 45,
      workingHours: weekdayHours(),
      busyIntervals: [],
      now: new Date(2026, 7, 12, 10, 0, 0),
    });
    expect(slots).toEqual([]);
  });
});
