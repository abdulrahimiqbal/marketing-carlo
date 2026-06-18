// Number / range formatting (§9). The whole point: never present a misleadingly
// precise integer. Counts get sensible rounding; ranges are always shown as a
// span; percentiles carry plain-language labels.
import type { Range } from '../engine/types';

const EMPTY = '—';

function stripTrailingZero(s: string): string {
  return s.endsWith('.0') ? s.slice(0, -2) : s;
}

/** People counts (visitors / signups / paying). §9 rounding rules. */
export function formatCount(n: number): string {
  if (!Number.isFinite(n)) return EMPTY;
  const abs = Math.abs(n);
  if (abs < 10) return stripTrailingZero(n.toFixed(1)); // <10 → 1 decimal allowed
  if (abs < 1000) return String(Math.round(n)); // ≥10 → integers
  if (abs < 1_000_000) return `${stripTrailingZero((n / 1000).toFixed(1))}k`;
  return `${stripTrailingZero((n / 1_000_000).toFixed(1))}M`;
}

/** Currency (budgets, spend, cost-per-paying). */
export function formatMoney(n: number): string {
  if (!Number.isFinite(n)) return EMPTY;
  if (n === 0) return '$0';
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs < 10) return `${sign}$${abs.toFixed(2)}`; // $3.50, $0.60
  if (abs < 1_000_000) return `${sign}$${Math.round(abs).toLocaleString('en-US')}`;
  return `${sign}$${stripTrailingZero((abs / 1_000_000).toFixed(1))}M`;
}

/** Rates shown as percentages: 0.009 → "0.9%", 0.05 → "5%". */
export function formatPercent(fraction: number): string {
  if (!Number.isFinite(fraction)) return EMPTY;
  const pct = fraction * 100;
  const abs = Math.abs(pct);
  const decimals = abs < 1 ? 2 : abs < 10 ? 1 : 0;
  return `${stripTrailingZero(pct.toFixed(decimals))}%`;
}

export type ValueKind = 'count' | 'money' | 'percent' | 'number';

export function formatValue(n: number, kind: ValueKind): string {
  switch (kind) {
    case 'money':
      return formatMoney(n);
    case 'percent':
      return formatPercent(n);
    case 'count':
      return formatCount(n);
    case 'number':
      return Number.isFinite(n) ? Math.round(n).toLocaleString('en-US') : EMPTY;
  }
}

/** Compact range for cards: "4–31" (en dash). */
export function formatRangeCompact(range: Range, kind: ValueKind = 'count'): string {
  return `${formatValue(range.p10, kind)}–${formatValue(range.p90, kind)}`;
}

/** Prose range: "4 to 31" (§9 phrasing). */
export function formatRangeProse(range: Range, kind: ValueKind = 'count'): string {
  return `${formatValue(range.p10, kind)} to ${formatValue(range.p90, kind)}`;
}

/** Plain-language percentile labels (§9). */
export const PERCENTILE_LABELS = {
  p10: 'pessimistic',
  p50: 'most likely',
  p90: 'optimistic',
} as const;

/** For inspector inputs: percent assumptions edit in % units, others raw. */
export function toEditUnits(value: number, kind: ValueKind): number {
  return kind === 'percent' ? value * 100 : value;
}

export function fromEditUnits(value: number, kind: ValueKind): number {
  return kind === 'percent' ? value / 100 : value;
}
