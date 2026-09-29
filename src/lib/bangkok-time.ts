// The business calendar runs on Thailand time (UTC+7), NOT the server's UTC.
// On Vercel `new Date().toISOString()` / `getUTCDate()` are UTC, so during the
// first 7 hours of a month (or day) they still report the previous month/day in
// Bangkok — which would remind or report for the wrong period. These helpers
// derive the wall-clock month/day/date in Asia/Bangkok regardless of server TZ.

const TZ = 'Asia/Bangkok';

// Wall-clock Y/M/D parts in Bangkok. formatToParts avoids locale format ambiguity.
function bangkokParts(now: Date): { year: string; month: string; day: string } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const get = (t: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === t)!.value;
  return { year: get('year'), month: get('month'), day: get('day') };
}

// "YYYY-MM" for the current month in Bangkok.
export function currentPeriodBangkok(now: Date = new Date()): string {
  const { year, month } = bangkokParts(now);
  return `${year}-${month}`;
}

// Day-of-month (1–31) in Bangkok.
export function currentDayBangkok(now: Date = new Date()): number {
  return Number(bangkokParts(now).day);
}

// "YYYY-MM-DD" for the current date in Bangkok (used as the reminder dedup key).
export function currentDateBangkok(now: Date = new Date()): string {
  const { year, month, day } = bangkokParts(now);
  return `${year}-${month}-${day}`;
}
