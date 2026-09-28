import { it, expect } from 'vitest';
import { summarize, type ClaimRow } from './aggregate';

const rows: ClaimRow[] = [
  { submitterName: 'สมชาย', categoryName: 'Claude', amountThb: 3000, status: 'paid' },
  { submitterName: 'สมชาย', categoryName: 'ChatGPT', amountThb: 1000, status: 'approved' },
  { submitterName: 'วีระ', categoryName: 'Claude', amountThb: 2000, status: 'submitted' },
  { submitterName: 'วีระ', categoryName: 'Cursor', amountThb: 500, status: 'rejected' },
];

it('total excludes rejected', () => {
  const s = summarize(rows);
  expect(s.total).toBe(6000); // 3000 + 1000 + 2000
  expect(s.count).toBe(3);
});
it('splits paid vs approved-unpaid (with count)', () => {
  const s = summarize(rows);
  expect(s.paidTotal).toBe(3000);
  expect(s.approvedUnpaidTotal).toBe(1000);
  expect(s.approvedUnpaidCount).toBe(1);
});
it('tracks submitted (รอตรวจ) total + count', () => {
  const s = summarize(rows);
  expect(s.submittedTotal).toBe(2000);
  expect(s.submittedCount).toBe(1);
});
it('tracks returned (ตีกลับ) total + count', () => {
  const s = summarize(rows);
  expect(s.returnedTotal).toBe(0);
  expect(s.returnedCount).toBe(0);
});
it('groups by person with paid/unpaid split (excluding rejected), sorted by total desc', () => {
  const s = summarize(rows);
  expect(s.byPerson).toEqual([
    { name: 'สมชาย', count: 2, total: 4000, paid: 3000, unpaid: 1000 },
    { name: 'วีระ', count: 1, total: 2000, paid: 0, unpaid: 0 },
  ]);
});
it('groups by category (excluding rejected), sorted by total desc', () => {
  const s = summarize(rows);
  expect(s.byCategory).toEqual([
    { name: 'Claude', total: 5000 },
    { name: 'ChatGPT', total: 1000 },
  ]);
});
it('counts returned toward total + person.total, but not paid/unpaid', () => {
  const withReturned: ClaimRow[] = [
    { submitterName: 'ก', categoryName: 'X', amountThb: 100, status: 'returned' },
    { submitterName: 'ก', categoryName: 'X', amountThb: 50, status: 'paid' },
  ];
  const s = summarize(withReturned);
  expect(s.returnedTotal).toBe(100);
  expect(s.returnedCount).toBe(1);
  expect(s.total).toBe(150); // returned + paid, both non-rejected
  expect(s.byPerson).toEqual([{ name: 'ก', count: 2, total: 150, paid: 50, unpaid: 0 }]);
});
it('empty input -> zeros', () => {
  expect(summarize([])).toEqual({
    total: 0,
    count: 0,
    paidTotal: 0,
    approvedUnpaidTotal: 0,
    approvedUnpaidCount: 0,
    submittedTotal: 0,
    submittedCount: 0,
    returnedTotal: 0,
    returnedCount: 0,
    byPerson: [],
    byCategory: [],
  });
});
