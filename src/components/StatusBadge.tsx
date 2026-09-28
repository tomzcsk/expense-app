import { statusLabelTh, type ClaimStatus } from '@/lib/claims/status';

const COLOR: Record<ClaimStatus, string> = {
  submitted: 'bg-blue-100 text-blue-700',
  approved: 'bg-yellow-100 text-yellow-700',
  returned: 'bg-orange-100 text-orange-700',
  rejected: 'bg-red-100 text-red-700',
  paid: 'bg-green-100 text-green-700',
};

export function StatusBadge({ status }: { status: ClaimStatus }) {
  return <span className={`rounded px-2 py-0.5 text-xs ${COLOR[status]}`}>{statusLabelTh(status)}</span>;
}
