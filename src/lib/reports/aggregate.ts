import type { ClaimStatus } from '../claims/status';

export interface ClaimRow {
  submitterName: string;
  categoryName: string;
  amountThb: number;
  status: ClaimStatus;
}

export interface PersonSummary {
  name: string;
  count: number;
  total: number;
  paid: number;
  unpaid: number;
}

export interface MonthlySummary {
  total: number;
  count: number;
  paidTotal: number;
  unpaidTotal: number;
  unpaidCount: number;
  returnedTotal: number;
  returnedCount: number;
  byPerson: PersonSummary[];
  byCategory: { name: string; total: number }[];
}

// Money "in flight or done" — everything except rejected.
const COUNTS = (s: ClaimStatus) => s !== 'rejected';
// Awaiting payment: submitted (new flow, pay-on-submit) or approved (legacy).
const UNPAID = (s: ClaimStatus) => s === 'submitted' || s === 'approved';

export function summarize(rows: ClaimRow[]): MonthlySummary {
  const counted = rows.filter((r) => COUNTS(r.status));

  const sumWhere = (pred: (s: ClaimStatus) => boolean) =>
    rows.filter((r) => pred(r.status)).reduce((n, r) => n + r.amountThb, 0);
  const countWhere = (pred: (s: ClaimStatus) => boolean) => rows.filter((r) => pred(r.status)).length;

  const total = counted.reduce((n, r) => n + r.amountThb, 0);
  const paidTotal = sumWhere((s) => s === 'paid');
  const unpaidTotal = sumWhere(UNPAID);
  const unpaidCount = countWhere(UNPAID);
  const returnedTotal = sumWhere((s) => s === 'returned');
  const returnedCount = countWhere((s) => s === 'returned');

  const person = new Map<string, PersonSummary>();
  const cat = new Map<string, { name: string; total: number }>();
  for (const r of counted) {
    const p = person.get(r.submitterName) ?? { name: r.submitterName, count: 0, total: 0, paid: 0, unpaid: 0 };
    p.count += 1;
    p.total += r.amountThb;
    if (r.status === 'paid') p.paid += r.amountThb;
    if (UNPAID(r.status)) p.unpaid += r.amountThb;
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
    unpaidTotal,
    unpaidCount,
    returnedTotal,
    returnedCount,
    byPerson: [...person.values()].sort(byTotalDesc),
    byCategory: [...cat.values()].sort(byTotalDesc),
  };
}
