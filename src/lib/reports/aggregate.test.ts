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
it('splits paid vs approved-unpaid', () => {
  const s = summarize(rows);
  expect(s.paidTotal).toBe(3000);
  expect(s.approvedUnpaidTotal).toBe(1000);
});
it('groups by person (excluding rejected), sorted by total desc', () => {
  const s = summarize(rows);
  expect(s.byPerson).toEqual([
    { name: 'สมชาย', count: 2, total: 4000 },
    { name: 'วีระ', count: 1, total: 2000 },
  ]);
});
it('groups by category (excluding rejected), sorted by total desc', () => {
  const s = summarize(rows);
  expect(s.byCategory).toEqual([
    { name: 'Claude', total: 5000 },
    { name: 'ChatGPT', total: 1000 },
  ]);
});
it('empty input -> zeros', () => {
  expect(summarize([])).toEqual({
    total: 0, count: 0, paidTotal: 0, approvedUnpaidTotal: 0, byPerson: [], byCategory: [],
  });
});
