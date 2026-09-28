export interface CsvHeader {
  key: string;
  label: string;
}

const esc = (v: unknown): string => {
  let s = String(v ?? '');
  // Neutralize CSV/formula injection: spreadsheet apps execute cells that begin
  // with = + - @ (or tab/CR). Prefix such cells with a single quote so they stay text.
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
};

export function toCsv(rows: Record<string, unknown>[], headers: CsvHeader[]): string {
  const head = headers.map((h) => esc(h.label)).join(',');
  const body = rows.map((r) => headers.map((h) => esc(r[h.key])).join(',')).join('\n');
  return body ? `${head}\n${body}` : head;
}
