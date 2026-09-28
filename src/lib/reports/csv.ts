export interface CsvHeader {
  key: string;
  label: string;
}

const esc = (v: unknown): string => `"${String(v ?? '').replace(/"/g, '""')}"`;

export function toCsv(rows: Record<string, unknown>[], headers: CsvHeader[]): string {
  const head = headers.map((h) => esc(h.label)).join(',');
  const body = rows.map((r) => headers.map((h) => esc(r[h.key])).join(',')).join('\n');
  return body ? `${head}\n${body}` : head;
}
