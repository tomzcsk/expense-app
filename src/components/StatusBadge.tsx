import { statusLabelTh, type ClaimStatus } from '@/lib/claims/status';

const STYLE: Record<ClaimStatus, { bg: string; fg: string; icon: string }> = {
  submitted: { bg: '#2a2410', fg: '#fbbf24', icon: '⏳' },
  approved: { bg: '#10233a', fg: '#60a5fa', icon: '' },
  returned: { bg: '#2e1c10', fg: '#fb923c', icon: '↩' },
  rejected: { bg: '#2a1416', fg: '#f87171', icon: '✕' },
  paid: { bg: '#10231b', fg: '#34d399', icon: '✓' },
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
