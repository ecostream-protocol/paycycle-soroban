export const STROOPS = 10_000_000n;

export const PERIODS = [
  { id: 'minute', label: 'Every minute (testing)', seconds: 60n },
  { id: 'daily', label: 'Daily', seconds: 86_400n },
  { id: 'weekly', label: 'Weekly', seconds: 604_800n },
  { id: 'monthly', label: 'Monthly (30 days)', seconds: 2_592_000n },
] as const;

/** Parses a decimal string such as "10.5" into base units without floating point. */
export function toStroops(input: string): bigint {
  const m = /^(\d+)(?:\.(\d{1,7}))?$/.exec(input.trim());
  if (!m) throw new Error('Enter a positive number with up to 7 decimals');
  return BigInt(m[1]) * STROOPS + BigInt((m[2] ?? '').padEnd(7, '0'));
}

/** Formats base units as a decimal string with at least two decimals. */
export function fromStroops(value: bigint): string {
  const neg = value < 0n;
  const abs = neg ? -value : value;
  const whole = abs / STROOPS;
  const frac = (abs % STROOPS).toString().padStart(7, '0').replace(/0+$/, '').padEnd(2, '0');
  return `${neg ? '-' : ''}${whole}.${frac}`;
}

export const secondsUntil = (nextCharge: bigint, nowSec: number): number =>
  Math.max(0, Number(nextCharge) - nowSec);

export const isDueAt = (nextCharge: bigint, nowSec: number): boolean => nowSec >= Number(nextCharge);

/** 0 at the start of a billing period, 1 when the next charge is due. */
export function progress(nextCharge: bigint, period: bigint, nowSec: number): number {
  const total = Number(period);
  if (total <= 0) return 1;
  const remaining = secondsUntil(nextCharge, nowSec);
  return Math.min(1, Math.max(0, 1 - remaining / total));
}

export function formatDuration(seconds: number): string {
  if (seconds <= 0) return 'now';
  const d = Math.floor(seconds / 86_400);
  const h = Math.floor((seconds % 86_400) / 3_600);
  const m = Math.floor((seconds % 3_600) / 60);
  const s = Math.floor(seconds % 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}
