import { describe, expect, it } from 'vitest';
import { formatDuration, fromStroops, isDueAt, progress, secondsUntil, toStroops } from './time';

describe('amounts', () => {
  it('parses decimals exactly', () => {
    expect(toStroops('10.5')).toBe(105_000_000n);
    expect(toStroops('0.0000001')).toBe(1n);
    expect(toStroops('7')).toBe(70_000_000n);
  });
  it('rejects invalid input', () => {
    for (const bad of ['', 'abc', '-1', '1.12345678', '1,5']) expect(() => toStroops(bad)).toThrow();
  });
  it('formats base units', () => {
    expect(fromStroops(105_000_000n)).toBe('10.50');
    expect(fromStroops(1n)).toBe('0.0000001');
    expect(fromStroops(0n)).toBe('0.00');
  });
});

describe('time helpers', () => {
  it('computes remaining seconds and due state', () => {
    expect(secondsUntil(1100n, 1000)).toBe(100);
    expect(secondsUntil(900n, 1000)).toBe(0);
    expect(isDueAt(1000n, 1000)).toBe(true);
    expect(isDueAt(1001n, 1000)).toBe(false);
  });
  it('computes progress through a period', () => {
    expect(progress(4600n, 3600n, 1000)).toBe(0);
    expect(progress(4600n, 3600n, 2800)).toBeCloseTo(0.5);
    expect(progress(4600n, 3600n, 9999)).toBe(1);
  });
  it('formats durations', () => {
    expect(formatDuration(0)).toBe('now');
    expect(formatDuration(75)).toBe('1m 15s');
    expect(formatDuration(3 * 3600 + 120)).toBe('3h 2m');
    expect(formatDuration(2 * 86_400 + 3600)).toBe('2d 1h');
  });
});
