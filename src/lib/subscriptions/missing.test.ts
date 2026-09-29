import { it, expect } from 'vitest';
import { computeMissing, type Subscription } from './missing';

const subs: Subscription[] = [
  { id: 's1', personId: 'p1', personName: 'สมชาย', categoryId: 'c1', categoryName: 'Claude', expectedAmount: 1000 },
  { id: 's2', personId: 'p1', personName: 'สมชาย', categoryId: 'c2', categoryName: 'ChatGPT', expectedAmount: 700 },
  { id: 's3', personId: 'p2', personName: 'วีระ', categoryId: 'c1', categoryName: 'Claude', expectedAmount: 1000 },
];

it('marks submitted when a matching person+category claim exists, missing otherwise', () => {
  const r = computeMissing(subs, [{ personId: 'p1', categoryId: 'c1' }]);
  expect(r.rows.find((x) => x.id === 's1')!.submitted).toBe(true);
  expect(r.rows.find((x) => x.id === 's2')!.submitted).toBe(false);
  expect(r.rows.find((x) => x.id === 's3')!.submitted).toBe(false);
  expect(r.missingCount).toBe(2);
  expect(r.missingPeople).toBe(2); // สมชาย (s2) + วีระ (s3)
});

it('sorts missing (ยังไม่ส่ง) rows to the top', () => {
  const r = computeMissing(subs, [{ personId: 'p1', categoryId: 'c1' }]);
  expect(r.rows[0].submitted).toBe(false);
  expect(r.rows[r.rows.length - 1].submitted).toBe(true);
});

it('a rejected-only claim does not count (caller filters); no claims → all missing', () => {
  const r = computeMissing(subs, []);
  expect(r.missingCount).toBe(3);
  expect(r.missingPeople).toBe(2);
});

it('empty subscriptions → zeros', () => {
  expect(computeMissing([], [{ personId: 'p1', categoryId: 'c1' }])).toEqual({
    rows: [],
    missingCount: 0,
    missingPeople: 0,
  });
});
