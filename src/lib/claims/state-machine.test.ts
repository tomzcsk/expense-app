import { it, expect } from 'vitest';
import { canTransition } from './state-machine';

it('manager pays / returns / rejects a submitted claim directly (no approve step)', () => {
  expect(canTransition('submitted', 'paid', 'manager')).toBe(true);
  expect(canTransition('submitted', 'returned', 'manager')).toBe(true);
  expect(canTransition('submitted', 'rejected', 'manager')).toBe(true);
});
it('approve is no longer a valid transition', () => {
  expect(canTransition('submitted', 'approved', 'manager')).toBe(false);
});
it('legacy approved claims can still be paid or returned', () => {
  expect(canTransition('approved', 'paid', 'manager')).toBe(true);
  expect(canTransition('approved', 'returned', 'manager')).toBe(true);
});
it('paid/rejected are terminal', () => {
  expect(canTransition('paid', 'submitted', 'manager')).toBe(false);
  expect(canTransition('rejected', 'submitted', 'manager')).toBe(false);
});
it('submitter can only resubmit a returned claim', () => {
  expect(canTransition('returned', 'submitted', 'submitter')).toBe(true);
  expect(canTransition('submitted', 'paid', 'submitter')).toBe(false);
});
