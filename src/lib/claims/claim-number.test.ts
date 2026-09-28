import { it, expect } from 'vitest';
import { formatClaimNo } from './claim-number';

it('formats YYMM-NNN from period + sequence', () => {
  expect(formatClaimNo('2026-09', 1)).toBe('2609-001');
  expect(formatClaimNo('2026-09', 42)).toBe('2609-042');
  expect(formatClaimNo('2026-12', 137)).toBe('2612-137');
});
