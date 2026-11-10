export const truncateAddress = (a: string, head = 5, tail = 5): string =>
  a.length <= head + tail + 1 ? a : `${a.slice(0, head)}…${a.slice(-tail)}`;

export const fmtDate = (unixSeconds: bigint): string =>
  new Date(Number(unixSeconds) * 1000).toLocaleString(undefined, {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });

/** Human label for a period in seconds, e.g. 86400 -> "day". */
export function periodLabel(seconds: bigint): string {
  const map: Record<string, string> = { '60': 'minute', '3600': 'hour', '86400': 'day', '604800': 'week', '2592000': 'month' };
  return map[seconds.toString()] ?? `${seconds}s`;
}
