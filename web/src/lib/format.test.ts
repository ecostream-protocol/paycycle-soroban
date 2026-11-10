import { describe, expect, it } from 'vitest';
import { periodLabel, truncateAddress } from './format';

describe('format', () => {
  it('truncates long addresses only', () => {
    expect(truncateAddress('G' + 'A'.repeat(55))).toBe('GAAAA…AAAAA');
    expect(truncateAddress('GSHORT')).toBe('GSHORT');
  });
  it('labels common periods', () => {
    expect(periodLabel(86_400n)).toBe('day');
    expect(periodLabel(2_592_000n)).toBe('month');
    expect(periodLabel(90n)).toBe('90s');
  });
});
