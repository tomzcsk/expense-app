export const CLAIM_STATUSES = ['submitted', 'approved', 'returned', 'rejected', 'paid'] as const;
export type ClaimStatus = (typeof CLAIM_STATUSES)[number];

const LABELS: Record<ClaimStatus, string> = {
  submitted: 'รออนุมัติ',
  approved: 'อนุมัติแล้ว·รอจ่าย',
  returned: 'ตีกลับให้แก้',
  rejected: 'ปฏิเสธ',
  paid: 'จ่ายแล้ว',
};

export function statusLabelTh(s: ClaimStatus): string {
  return LABELS[s];
}
