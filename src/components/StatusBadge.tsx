import { statusLabelTh, type ClaimStatus } from '@/lib/claims/status';

const STYLE: Record<ClaimStatus, { bg: string; fg: string; icon: string }> = {
  submitted: { bg: '#fef3c7', fg: '#d97706', icon: '⏳' },
  approved: { bg: '#dbeafe', fg: '#2563eb', icon: '' },
  returned: { bg: '#ffedd5', fg: '#ea580c', icon: '↩' },
  rejected: { bg: '#fee2e2', fg: '#dc2626', icon: '✕' },
  paid: { bg: '#dcfce7', fg: '#16a34a', icon: '✓' },
};

export function StatusBadge({ status }: { status: ClaimStatus }) {
  const s = STYLE[status];
  return (
    <span className="pill" style={{ backgroundColor: s.bg, color: s.fg }}>
      {s.icon && <span aria-hidden>{s.icon}</span>}
      {statusLabelTh(status)}
    </span>
  );
}
