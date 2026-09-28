import { statusLabelTh, type ClaimStatus } from '@/lib/claims/status';

const STYLE: Record<ClaimStatus, { bg: string; fg: string }> = {
  submitted: { bg: '#fef3c7', fg: '#b45309' },
  approved: { bg: '#dbeafe', fg: '#2563eb' }, // legacy
  returned: { bg: '#ffedd5', fg: '#ea580c' },
  rejected: { bg: '#fee2e2', fg: '#dc2626' },
  paid: { bg: '#dcfce7', fg: '#15803d' },
};

export function StatusBadge({ status }: { status: ClaimStatus }) {
  const s = STYLE[status];
  return (
    <span className="pill" style={{ backgroundColor: s.bg, color: s.fg }}>
      {statusLabelTh(status)}
    </span>
  );
}
