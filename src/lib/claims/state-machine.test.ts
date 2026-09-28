import { it, expect } from 'vitest';
import { canTransition } from './state-machine';

it('manager can approve/return/reject a submitted claim', () => {
  expect(canTransition('submitted', 'approved', 'manager')).toBe(true);
  expect(canTransition('submitted', 'returned', 'manager')).toBe(true);
  expect(canTransition('submitted', 'rejected', 'manager')).toBe(true);
});
it('manager can pay or return an approved claim', () => {
  expect(canTransition('approved', 'paid', 'manager')).toBe(true);
  expect(canTransition('approved', 'returned', 'manager')).toBe(true);
});
it('manager cannot pay a submitted claim (must approve first)', () => {
  expect(canTransition('submitted', 'paid', 'manager')).toBe(false);
});
it('paid/rejected are terminal', () => {
  expect(canTransition('paid', 'approved', 'manager')).toBe(false);
  expect(canTransition('rejected', 'submitted', 'manager')).toBe(false);
});
it('submitter can only resubmit a returned claim', () => {
  expect(canTransition('returned', 'submitted', 'submitter')).toBe(true);
  expect(canTransition('submitted', 'approved', 'submitter')).toBe(false);
});
