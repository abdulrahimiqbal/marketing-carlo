// Benchmark seed values (§6) + fixed-input defaults + the node factory.
// These are STARTING ESTIMATES, labelled in-app as "starting estimates — adjust
// to your reality." They are editable defaults, not claimed truth.

import type { ChannelType, Uncertain, Vertical, ChannelNode } from '../engine/types';
import { CHANNEL_META } from '../engine/funnel';
import { genId } from '../lib/id';

type BenchmarkTable = Record<string, Uncertain>;

/** Per-vertical seed assumptions. Each cell is low / expected / high (§6). */
export const BENCHMARKS: Record<Vertical, BenchmarkTable> = {
  b2b_saas: {
    cpm: { low: 9, expected: 14, high: 22 },
    ctr: { low: 0.006, expected: 0.009, high: 0.014 },
    cpc: { low: 2.0, expected: 3.5, high: 6.0 },
    reachRate: { low: 0.05, expected: 0.15, high: 0.35 },
    linkCtr: { low: 0.005, expected: 0.012, high: 0.025 },
    signupRate: { low: 0.02, expected: 0.05, high: 0.09 },
    paidConversionRate: { low: 0.01, expected: 0.03, high: 0.06 },
  },
  consumer_app: {
    cpm: { low: 6, expected: 10, high: 16 },
    ctr: { low: 0.008, expected: 0.012, high: 0.018 },
    cpc: { low: 0.8, expected: 1.5, high: 3.0 },
    reachRate: { low: 0.08, expected: 0.2, high: 0.45 },
    linkCtr: { low: 0.008, expected: 0.015, high: 0.03 },
    signupRate: { low: 0.05, expected: 0.12, high: 0.22 },
    paidConversionRate: { low: 0.01, expected: 0.02, high: 0.05 },
  },
  ecommerce: {
    cpm: { low: 7, expected: 11, high: 18 },
    ctr: { low: 0.009, expected: 0.013, high: 0.02 },
    cpc: { low: 0.6, expected: 1.2, high: 2.5 },
    reachRate: { low: 0.08, expected: 0.2, high: 0.45 },
    linkCtr: { low: 0.01, expected: 0.018, high: 0.035 },
    // ecommerce: signupRate = visitor→add-to-cart, paidConversionRate = cart→purchase
    signupRate: { low: 0.03, expected: 0.06, high: 0.11 },
    paidConversionRate: { low: 0.3, expected: 0.5, high: 0.7 },
  },
};

/** Fixed-input defaults when a node is created (§6). All user-editable. */
export const FIXED_DEFAULTS: Record<ChannelType, Record<string, number>> = {
  meta_ads: { budget: 1000 },
  google_search: { budget: 1000 },
  x_organic: { followers: 1000, numPosts: 1 },
};

export const CHANNEL_TYPES: ChannelType[] = ['meta_ads', 'google_search', 'x_organic'];

export const CHANNEL_LABELS: Record<ChannelType, string> = {
  meta_ads: 'Meta Ads',
  google_search: 'Google Search',
  x_organic: 'X / Twitter Organic',
};

export const CHANNEL_SHORT_LABELS: Record<ChannelType, string> = {
  meta_ads: 'Meta',
  google_search: 'Google',
  x_organic: 'X organic',
};

export const VERTICAL_LABELS: Record<Vertical, string> = {
  b2b_saas: 'B2B SaaS',
  consumer_app: 'Consumer App',
  ecommerce: 'E-commerce',
};

/** Human-readable assumption labels and units, for the inspector. */
export const ASSUMPTION_META: Record<
  string,
  { label: string; unit: 'currency' | 'percent' | 'number'; help?: string }
> = {
  cpm: { label: 'CPM', unit: 'currency', help: 'Cost per 1,000 impressions' },
  ctr: { label: 'Click-through rate', unit: 'percent' },
  cpc: { label: 'CPC', unit: 'currency', help: 'Cost per click' },
  reachRate: { label: 'Reach rate', unit: 'percent', help: 'Share of followers who see a post' },
  linkCtr: { label: 'Link click-through rate', unit: 'percent' },
  signupRate: { label: 'Signup rate', unit: 'percent', help: 'Visitor → signup' },
  paidConversionRate: {
    label: 'Paid conversion rate',
    unit: 'percent',
    help: 'Signup → paying',
  },
};

/** Ecommerce stage renames (§6 hint). */
export const ECOMMERCE_STAGE_OVERRIDES: Record<string, { label: string; help: string }> = {
  signupRate: { label: 'Add-to-cart rate', help: 'Visitor → add to cart' },
  paidConversionRate: { label: 'Purchase rate', help: 'Cart → purchase' },
};

export const FIXED_INPUT_META: Record<
  string,
  { label: string; unit: 'currency' | 'number' }
> = {
  budget: { label: 'Budget', unit: 'currency' },
  followers: { label: 'Followers', unit: 'number' },
  numPosts: { label: 'Number of posts', unit: 'number' },
};

/**
 * Create a new channel node seeded from the vertical's benchmarks. Only the
 * assumption keys and fixed inputs relevant to the channel are included.
 */
export function createChannelNode(
  type: ChannelType,
  vertical: Vertical,
  position: { x: number; y: number },
  id?: string,
): ChannelNode {
  const meta = CHANNEL_META[type];
  const bench = BENCHMARKS[vertical];

  const assumptions: Record<string, Uncertain> = {};
  for (const key of meta.assumptionKeys) {
    assumptions[key] = { ...bench[key] };
  }

  return {
    id: id ?? genId(),
    type,
    label: CHANNEL_LABELS[type],
    position,
    fixedInputs: { ...FIXED_DEFAULTS[type] },
    assumptions,
    actuals: {},
  };
}

/** The benchmark default for a single assumption (for "reset to benchmark"). */
export function benchmarkFor(vertical: Vertical, key: string): Uncertain | undefined {
  const u = BENCHMARKS[vertical][key];
  return u ? { ...u } : undefined;
}
