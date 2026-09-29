// Pure matcher for ตกเบิก (missed reimbursement): given the active recurring
// subscriptions (the "expected" list) and the month's non-rejected claim keys,
// mark each subscription submitted / missing. Matching key = person + category.

export type Subscription = {
  id: string;
  personId: string;
  personName: string;
  categoryId: string | null;
  categoryName: string | null;
  expectedAmount: number | null;
};
export type ClaimKey = { personId: string; categoryId: string | null };
export type MissingRow = Subscription & { submitted: boolean };
export type MissingResult = { rows: MissingRow[]; missingCount: number; missingPeople: number };

export function computeMissing(subs: Subscription[], claims: ClaimKey[]): MissingResult {
  const submitted = new Set(
    claims.filter((c) => c.categoryId).map((c) => `${c.personId}::${c.categoryId}`),
  );
  const rows: MissingRow[] = subs.map((s) => ({
    ...s,
    submitted: !!s.categoryId && submitted.has(`${s.personId}::${s.categoryId}`),
  }));
  // Missing (ยังไม่ส่ง) first, then by person name.
  rows.sort(
    (a, b) => Number(a.submitted) - Number(b.submitted) || a.personName.localeCompare(b.personName, 'th'),
  );
  const missing = rows.filter((r) => !r.submitted);
  return {
    rows,
    missingCount: missing.length,
    missingPeople: new Set(missing.map((r) => r.personId)).size,
  };
}
