import type { ClaimStatus } from './status';

export type Actor = 'submitter' | 'manager';

const MANAGER: Record<ClaimStatus, ClaimStatus[]> = {
  submitted: ['approved', 'returned', 'rejected'],
  approved: ['paid', 'returned'],
  returned: [],
  rejected: [],
  paid: [],
};

export function canTransition(from: ClaimStatus, to: ClaimStatus, actor: Actor): boolean {
  if (actor === 'manager') return MANAGER[from].includes(to);
  // submitter: only resubmit a returned claim
  return actor === 'submitter' && from === 'returned' && to === 'submitted';
}
