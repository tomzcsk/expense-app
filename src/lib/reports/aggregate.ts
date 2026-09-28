import type { ClaimStatus } from '../claims/status';

export interface ClaimRow {
  submitterName: string;
  categoryName: string;
  amountThb: number;
  status: ClaimStatus;
}

export interface MonthlySummary {
  total: number;
  count: number;
  paidTotal: number;
  approvedUnpaidTotal: number;
  byPerson: { name: string; count: number; total: number }[];
  byCategory: { name: string; total: number }[];
}

// Money "in flight or done" — everything except rejected.
const COUNTS = (s: ClaimStatus) => s !== 'rejected';

export function summarize(rows: ClaimRow[]): MonthlySummary {
  const counted = rows.filter((r) => COUNTS(r.status));

  const total = counted.reduce((n, r) => n + r.amountThb, 0);
  const paidTotal = rows.filter((r) => r.status === 'paid').reduce((n, r) => n + r.amountThb, 0);
  const approvedUnpaidTotal = rows.filter((r) => r.status === 'approved').reduce((n, r) => n + r.amountThb, 0);

  const person = new Map<string, { name: string; count: number; total: number }>();
  const cat = new Map<string, { name: string; total: number }>();
  for (const r of counted) {
    const p = person.get(r.submitterName) ?? { name: r.submitterName, count: 0, total: 0 };
    p.count += 1;
    p.total += r.amountThb;
    person.set(r.submitterName, p);
    const c = cat.get(r.categoryName) ?? { name: r.categoryName, total: 0 };
    c.total += r.amountThb;
    cat.set(r.categoryName, c);
  }
  const byTotalDesc = <T extends { total: number }>(a: T, b: T) => b.total - a.total;

  return {
    total,
    count: counted.length,
    paidTotal,
    approvedUnpaidTotal,
    byPerson: [...person.values()].sort(byTotalDesc),
    byCategory: [...cat.values()].sort(byTotalDesc),
  };
}
