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
  approvedUnpaidTotal: number;
  approvedUnpaidCount: number;
  submittedTotal: number;
  submittedCount: number;
  returnedTotal: number;
  returnedCount: number;
  byPerson: PersonSummary[];
  byCategory: { name: string; total: number }[];
}

// Money "in flight or done" — everything except rejected.
const COUNTS = (s: ClaimStatus) => s !== 'rejected';

export function summarize(rows: ClaimRow[]): MonthlySummary {
  const counted = rows.filter((r) => COUNTS(r.status));

  const sumWhere = (st: ClaimStatus) =>
    rows.filter((r) => r.status === st).reduce((n, r) => n + r.amountThb, 0);
  const countWhere = (st: ClaimStatus) => rows.filter((r) => r.status === st).length;

  const total = counted.reduce((n, r) => n + r.amountThb, 0);
  const paidTotal = sumWhere('paid');
  const approvedUnpaidTotal = sumWhere('approved');
  const approvedUnpaidCount = countWhere('approved');
  const submittedTotal = sumWhere('submitted');
  const submittedCount = countWhere('submitted');
  const returnedTotal = sumWhere('returned');
  const returnedCount = countWhere('returned');

  const person = new Map<string, PersonSummary>();
  const cat = new Map<string, { name: string; total: number }>();
  for (const r of counted) {
    const p = person.get(r.submitterName) ?? { name: r.submitterName, count: 0, total: 0, paid: 0, unpaid: 0 };
    p.count += 1;
    p.total += r.amountThb;
    if (r.status === 'paid') p.paid += r.amountThb;
    if (r.status === 'approved') p.unpaid += r.amountThb;
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
    approvedUnpaidCount,
    submittedTotal,
    submittedCount,
    returnedTotal,
    returnedCount,
    byPerson: [...person.values()].sort(byTotalDesc),
    byCategory: [...cat.values()].sort(byTotalDesc),
  };
}
