// Benchmark seed values (§6) + fixed-input defaults + the node factory, scaled
// to the full channel library. These are STARTING ESTIMATES, labelled in-app as
// "starting estimates — adjust to your reality." They are editable defaults,
// not claimed truth.
//
// Model: downstream conversion (signup, paid) is VERTICAL-specific; entry-stage
// params (CPM, CTR, reach, etc.) are PLATFORM-specific. So entry benchmarks are
// keyed by channel; the original three channels keep their per-vertical values.

import type {
  ChannelGroup,
  ChannelType,
  Uncertain,
  Vertical,
  ChannelNode,
} from '../engine/types';
import { CHANNEL_META } from '../engine/funnel';
import { genId } from '../lib/id';

const u = (low: number, expected: number, high: number): Uncertain => ({ low, expected, high });

// ── Downstream funnel, per vertical (shared by every channel) ──────────────
export const DOWNSTREAM_BENCHMARKS: Record<
  Vertical,
  { signupRate: Uncertain; paidConversionRate: Uncertain }
> = {
  b2b_saas: { signupRate: u(0.02, 0.05, 0.09), paidConversionRate: u(0.01, 0.03, 0.06) },
  consumer_app: { signupRate: u(0.05, 0.12, 0.22), paidConversionRate: u(0.01, 0.02, 0.05) },
  // ecommerce: signupRate = visitor→add-to-cart, paidConversionRate = cart→purchase
  ecommerce: { signupRate: u(0.03, 0.06, 0.11), paidConversionRate: u(0.3, 0.5, 0.7) },
};

type EntryProfile = Record<string, Uncertain>;
type PerVertical = Record<Vertical, EntryProfile>;

/** Same entry profile across all verticals (platform-driven params). */
function flat(p: EntryProfile): PerVertical {
  return { b2b_saas: p, consumer_app: p, ecommerce: p };
}

// ── Entry-stage params, per channel ────────────────────────────────────────
export const ENTRY_BENCHMARKS: Record<ChannelType, PerVertical> = {
  // Original three keep their explicit per-vertical values.
  meta_ads: {
    b2b_saas: { cpm: u(9, 14, 22), ctr: u(0.006, 0.009, 0.014) },
    consumer_app: { cpm: u(6, 10, 16), ctr: u(0.008, 0.012, 0.018) },
    ecommerce: { cpm: u(7, 11, 18), ctr: u(0.009, 0.013, 0.02) },
  },
  google_search: {
    b2b_saas: { cpc: u(2.0, 3.5, 6.0) },
    consumer_app: { cpc: u(0.8, 1.5, 3.0) },
    ecommerce: { cpc: u(0.6, 1.2, 2.5) },
  },
  x_organic: {
    b2b_saas: { reachRate: u(0.05, 0.15, 0.35), linkCtr: u(0.005, 0.012, 0.025) },
    consumer_app: { reachRate: u(0.08, 0.2, 0.45), linkCtr: u(0.008, 0.015, 0.03) },
    ecommerce: { reachRate: u(0.08, 0.2, 0.45), linkCtr: u(0.01, 0.018, 0.035) },
  },

  // Added paid CPM channels (platform-driven, shared across verticals).
  tiktok_ads: flat({ cpm: u(4, 8, 14), ctr: u(0.008, 0.012, 0.018) }),
  linkedin_ads: flat({ cpm: u(25, 45, 75), ctr: u(0.004, 0.006, 0.01) }),
  reddit_ads: flat({ cpm: u(3, 6, 11), ctr: u(0.003, 0.006, 0.011) }),

  // Added paid CPC channel.
  bing_ads: flat({ cpc: u(0.8, 1.6, 3.2) }),

  // Added organic reach channels.
  linkedin_organic: flat({ reachRate: u(0.03, 0.08, 0.2), linkCtr: u(0.006, 0.013, 0.026) }),
  instagram_organic: flat({ reachRate: u(0.05, 0.12, 0.3), linkCtr: u(0.003, 0.008, 0.018) }),
  tiktok_organic: flat({ reachRate: u(0.1, 0.25, 0.8), linkCtr: u(0.004, 0.01, 0.025) }),

  // Email to an owned list.
  newsletter: flat({ openRate: u(0.25, 0.4, 0.55), clickRate: u(0.02, 0.05, 0.12) }),

  // Flat sponsorship: only the click-through is uncertain (reach & fee are set).
  influencer: flat({ linkCtr: u(0.005, 0.015, 0.04) }),
};

// ── Fixed-input defaults when a node is created (all user-editable) ─────────
export const FIXED_DEFAULTS: Record<ChannelType, Record<string, number>> = {
  meta_ads: { budget: 1000 },
  tiktok_ads: { budget: 1000 },
  linkedin_ads: { budget: 1000 },
  reddit_ads: { budget: 1000 },
  google_search: { budget: 1000 },
  bing_ads: { budget: 1000 },
  x_organic: { followers: 1000, numPosts: 1 },
  linkedin_organic: { followers: 1000, numPosts: 1 },
  instagram_organic: { followers: 1000, numPosts: 1 },
  tiktok_organic: { followers: 1000, numPosts: 1 },
  newsletter: { listSize: 5000 },
  influencer: { reach: 50000, cost: 500 },
};

export const CHANNEL_TYPES: ChannelType[] = [
  'meta_ads',
  'tiktok_ads',
  'linkedin_ads',
  'reddit_ads',
  'google_search',
  'bing_ads',
  'x_organic',
  'linkedin_organic',
  'instagram_organic',
  'tiktok_organic',
  'newsletter',
  'influencer',
];

export const CHANNEL_LABELS: Record<ChannelType, string> = {
  meta_ads: 'Meta Ads',
  tiktok_ads: 'TikTok Ads',
  linkedin_ads: 'LinkedIn Ads',
  reddit_ads: 'Reddit Ads',
  google_search: 'Google Search',
  bing_ads: 'Bing Ads',
  x_organic: 'X / Twitter Organic',
  linkedin_organic: 'LinkedIn Organic',
  instagram_organic: 'Instagram Organic',
  tiktok_organic: 'TikTok Organic',
  newsletter: 'Newsletter / Email',
  influencer: 'Influencer / Sponsored',
};

/** Short label for the compact channel picker (unambiguous within its group). */
export const CHANNEL_SHORT_LABELS: Record<ChannelType, string> = {
  meta_ads: 'Meta',
  tiktok_ads: 'TikTok',
  linkedin_ads: 'LinkedIn',
  reddit_ads: 'Reddit',
  google_search: 'Google',
  bing_ads: 'Bing',
  x_organic: 'X',
  linkedin_organic: 'LinkedIn',
  instagram_organic: 'Instagram',
  tiktok_organic: 'TikTok',
  newsletter: 'Newsletter',
  influencer: 'Influencer',
};

export const VERTICAL_LABELS: Record<Vertical, string> = {
  b2b_saas: 'B2B SaaS',
  consumer_app: 'Consumer App',
  ecommerce: 'E-commerce',
};

const GROUP_LABELS: Record<ChannelGroup, string> = {
  paid: 'Paid',
  organic: 'Organic',
  email: 'Email',
};

/** Channels grouped for the picker, derived from the registry. */
export const CHANNEL_GROUPS: { group: ChannelGroup; label: string; types: ChannelType[] }[] = (
  ['paid', 'organic', 'email'] as ChannelGroup[]
).map((group) => ({
  group,
  label: GROUP_LABELS[group],
  types: CHANNEL_TYPES.filter((t) => CHANNEL_META[t].group === group),
}));

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
  openRate: { label: 'Open rate', unit: 'percent', help: 'Recipients who open the email' },
  clickRate: { label: 'Click rate', unit: 'percent', help: 'Openers who click through' },
  signupRate: { label: 'Signup rate', unit: 'percent', help: 'Visitor → signup' },
  paidConversionRate: { label: 'Paid conversion rate', unit: 'percent', help: 'Signup → paying' },
};

/** Ecommerce stage renames (§6 hint). */
export const ECOMMERCE_STAGE_OVERRIDES: Record<string, { label: string; help: string }> = {
  signupRate: { label: 'Add-to-cart rate', help: 'Visitor → add to cart' },
  paidConversionRate: { label: 'Purchase rate', help: 'Cart → purchase' },
};

export const FIXED_INPUT_META: Record<string, { label: string; unit: 'currency' | 'number' }> = {
  budget: { label: 'Budget', unit: 'currency' },
  followers: { label: 'Followers', unit: 'number' },
  numPosts: { label: 'Number of posts', unit: 'number' },
  listSize: { label: 'List size', unit: 'number' },
  reach: { label: 'Estimated reach', unit: 'number' },
  cost: { label: 'Sponsorship fee', unit: 'currency' },
};

/** Plain-language description of how each channel turns inputs into visitors. */
export const CHANNEL_FORMULAS: Record<ChannelType, string> = {
  meta_ads: 'budget ÷ CPM × 1,000 = impressions → × CTR = visitors',
  tiktok_ads: 'budget ÷ CPM × 1,000 = impressions → × CTR = visitors',
  linkedin_ads: 'budget ÷ CPM × 1,000 = impressions → × CTR = visitors',
  reddit_ads: 'budget ÷ CPM × 1,000 = impressions → × CTR = visitors',
  google_search: 'budget ÷ CPC = visitors',
  bing_ads: 'budget ÷ CPC = visitors',
  x_organic: 'followers × reach rate × posts = impressions → × link CTR = visitors',
  linkedin_organic: 'followers × reach rate × posts = impressions → × link CTR = visitors',
  instagram_organic: 'followers × reach rate × posts = impressions → × link CTR = visitors',
  tiktok_organic: 'followers × reach rate × posts = impressions → × link CTR = visitors',
  newsletter: 'list size × open rate × click rate = visitors',
  influencer: 'estimated reach × link CTR = visitors',
};

/** Resolve the seed benchmark for one assumption of a channel + vertical. */
function resolveBenchmark(type: ChannelType, vertical: Vertical, key: string): Uncertain {
  if (key === 'signupRate' || key === 'paidConversionRate') {
    return { ...DOWNSTREAM_BENCHMARKS[vertical][key] };
  }
  const entry = ENTRY_BENCHMARKS[type][vertical]?.[key];
  return entry ? { ...entry } : u(0, 0, 0);
}

/**
 * Create a new channel node seeded from the channel + vertical benchmarks. Only
 * the assumption keys and fixed inputs relevant to the channel are included.
 */
export function createChannelNode(
  type: ChannelType,
  vertical: Vertical,
  position: { x: number; y: number },
  id?: string,
): ChannelNode {
  const meta = CHANNEL_META[type];
  const assumptions: Record<string, Uncertain> = {};
  for (const key of meta.assumptionKeys) {
    assumptions[key] = resolveBenchmark(type, vertical, key);
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
export function benchmarkFor(type: ChannelType, vertical: Vertical, key: string): Uncertain {
  return resolveBenchmark(type, vertical, key);
}
