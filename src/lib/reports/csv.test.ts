import { it, expect } from 'vitest';
import { toCsv } from './csv';

const headers = [
  { key: 'claim_no', label: 'เลขที่' },
  { key: 'amount', label: 'ยอด' },
];

it('writes header + rows, all fields quoted', () => {
  const csv = toCsv([{ claim_no: '2609-001', amount: 3000 }], headers);
  expect(csv).toBe('"เลขที่","ยอด"\n"2609-001","3000"');
});
it('escapes embedded quotes and keeps commas', () => {
  const csv = toCsv([{ claim_no: 'a,b', amount: 'x"y' }], headers);
  expect(csv).toBe('"เลขที่","ยอด"\n"a,b","x""y"');
});
it('null/undefined -> empty string', () => {
  const csv = toCsv([{ claim_no: null as unknown as string, amount: undefined }], headers);
  expect(csv).toBe('"เลขที่","ยอด"\n"",""');
});
