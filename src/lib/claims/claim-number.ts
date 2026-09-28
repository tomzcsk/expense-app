// Format YYMM-NNN, e.g. 2609-001. Documents the shape the create_claim RPC
// reproduces in SQL; the RPC is the runtime source of the number.
export function formatClaimNo(period: string, seq: number): string {
  const [year, month] = period.split('-');
  return `${year.slice(2)}${month}-${String(seq).padStart(3, '0')}`;
}
