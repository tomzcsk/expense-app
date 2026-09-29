import { describe, it, expect } from 'vitest';
import { currentPeriodBangkok, currentDayBangkok, currentDateBangkok } from './bangkok-time';

describe('bangkok-time', () => {
  // 2026-09-30 20:00 UTC = 2026-10-01 03:00 in Bangkok (UTC+7).
  // UTC would say month 2026-09 / day 30; Bangkok must say 2026-10 / day 1.
  const nearMonthFlip = new Date('2026-09-30T20:00:00Z');

  it('rolls to the next month in Bangkok while UTC is still previous month', () => {
    expect(nearMonthFlip.toISOString().slice(0, 7)).toBe('2026-09'); // the UTC bug
    expect(currentPeriodBangkok(nearMonthFlip)).toBe('2026-10');
    expect(currentDayBangkok(nearMonthFlip)).toBe(1);
    expect(currentDateBangkok(nearMonthFlip)).toBe('2026-10-01');
  });

  it('matches UTC once well inside the same day', () => {
    const midday = new Date('2026-09-15T05:00:00Z'); // 12:00 Bangkok
    expect(currentPeriodBangkok(midday)).toBe('2026-09');
    expect(currentDayBangkok(midday)).toBe(15);
    expect(currentDateBangkok(midday)).toBe('2026-09-15');
  });

  it('handles the day-flip near midnight Bangkok', () => {
    // 2026-09-24 18:00 UTC = 2026-09-25 01:00 Bangkok → reminder day 25 in TH.
    const dayFlip = new Date('2026-09-24T18:00:00Z');
    expect(dayFlip.getUTCDate()).toBe(24); // the UTC bug
    expect(currentDayBangkok(dayFlip)).toBe(25);
  });
});
