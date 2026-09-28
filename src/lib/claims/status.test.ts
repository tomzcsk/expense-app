import { it, expect } from 'vitest';
import { CLAIM_STATUSES, statusLabelTh } from './status';

it('has the five statuses', () => {
  expect(CLAIM_STATUSES).toEqual(['submitted', 'approved', 'returned', 'rejected', 'paid']);
});
it('gives a Thai label', () => {
  expect(statusLabelTh('paid')).toBe('จ่ายแล้ว');
  expect(statusLabelTh('submitted')).toBe('รอจ่าย');
});
