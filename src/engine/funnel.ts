// Entry stages + downstream funnel (§5.1–5.3), generalized to a channel
// registry so new channels are data, not code. Each channel maps to a funnel
// archetype; only the entry stage differs, everything reduces to the same
// downstream funnel.

import type {
  ChannelType,
  ChannelGroup,
  Confidence,
  FunnelArchetype,
} from './types';

interface ChannelDef {
  group: ChannelGroup;
  archetype: FunnelArchetype;
  /** Which fixed input equals spend ('budget' / 'cost'), or null for free channels. */
  spendInput: 'budget' | 'cost' | null;
  fixedInputs: string[];
  /** Sampling order is fixed (array order) so the seeded RNG stays reproducible. */
  assumptionKeys: string[];
  confidence: Confidence;
}

const DOWNSTREAM = ['signupRate', 'paidConversionRate'];

// Archetype templates keep per-channel defs DRY.
const CPM: Omit<ChannelDef, 'group' | 'confidence'> = {
  archetype: 'cpm',
  spendInput: 'budget',
  fixedInputs: ['budget'],
  assumptionKeys: ['cpm', 'ctr', ...DOWNSTREAM],
};
const CPC: Omit<ChannelDef, 'group' | 'confidence'> = {
  archetype: 'cpc',
  spendInput: 'budget',
  fixedInputs: ['budget'],
  assumptionKeys: ['cpc', ...DOWNSTREAM],
};
const REACH: Omit<ChannelDef, 'group' | 'confidence'> = {
  archetype: 'organic_reach',
  spendInput: null,
  fixedInputs: ['followers', 'numPosts'],
  assumptionKeys: ['reachRate', 'linkCtr', ...DOWNSTREAM],
};

/**
 * The single source of truth for every channel's structure. `paid` and `label`
 * are derived in presets; this keeps just the engine-relevant shape.
 */
export const CHANNEL_META: Record<ChannelType, ChannelDef> = {
  // Paid — CPM
  meta_ads: { ...CPM, group: 'paid', confidence: 'estimated' },
  tiktok_ads: { ...CPM, group: 'paid', confidence: 'estimated' },
  linkedin_ads: { ...CPM, group: 'paid', confidence: 'estimated' },
  reddit_ads: { ...CPM, group: 'paid', confidence: 'estimated' },
  youtube_ads: { ...CPM, group: 'paid', confidence: 'estimated' },
  pinterest_ads: { ...CPM, group: 'paid', confidence: 'estimated' },
  snapchat_ads: { ...CPM, group: 'paid', confidence: 'estimated' },
  // Paid — CPC
  google_search: { ...CPC, group: 'paid', confidence: 'estimated' },
  bing_ads: { ...CPC, group: 'paid', confidence: 'estimated' },
  // Organic — owned reach (power-law lottery → high variance)
  x_organic: { ...REACH, group: 'organic', confidence: 'estimated_high_variance' },
  linkedin_organic: { ...REACH, group: 'organic', confidence: 'estimated_high_variance' },
  instagram_organic: { ...REACH, group: 'organic', confidence: 'estimated_high_variance' },
  tiktok_organic: { ...REACH, group: 'organic', confidence: 'estimated_high_variance' },
  // Organic — earned: a launch-day spike (flat reach, free).
  product_hunt: {
    group: 'organic',
    archetype: 'flat_reach',
    spendInput: null,
    fixedInputs: ['reach'],
    assumptionKeys: ['linkCtr', ...DOWNSTREAM],
    confidence: 'estimated_high_variance',
  },
  // Organic — earned: SEO / content (search volume × your click share).
  seo_content: {
    group: 'organic',
    archetype: 'search_volume',
    spendInput: null,
    fixedInputs: ['searchVolume'],
    assumptionKeys: ['rankCtr', ...DOWNSTREAM],
    confidence: 'estimated_high_variance',
  },
  // Owned list — email (knowable list → assumption-based)
  newsletter: {
    group: 'email',
    archetype: 'email',
    spendInput: null,
    fixedInputs: ['listSize'],
    assumptionKeys: ['openRate', 'clickRate', ...DOWNSTREAM],
    confidence: 'estimated',
  },
  cold_email: {
    group: 'email',
    archetype: 'email',
    spendInput: null,
    fixedInputs: ['listSize'],
    assumptionKeys: ['openRate', 'clickRate', ...DOWNSTREAM],
    confidence: 'estimated',
  },
  // Paid — flat sponsorship (creator virality → high variance)
  influencer: {
    group: 'paid',
    archetype: 'flat_reach',
    spendInput: 'cost',
    fixedInputs: ['reach', 'cost'],
    assumptionKeys: ['linkCtr', ...DOWNSTREAM],
    confidence: 'estimated_high_variance',
  },
};

/** Convenience: a channel is "paid" when one of its fixed inputs is its spend. */
export function isPaid(type: ChannelType): boolean {
  return CHANNEL_META[type].spendInput !== null;
}

export interface FunnelDraw {
  visitors: number;
  signups: number;
  payingUsers: number;
}

/** Safe division — guards against zero/negative denominators from user edits. */
function safeDiv(numerator: number, denominator: number): number {
  return denominator > 0 ? numerator / denominator : 0;
}

/**
 * Channel-specific entry stage → visitors (§5.1), dispatched by archetype.
 * Bounce is folded into the downstream signupRate; there is no separate
 * click→site stage in v1.
 */
export function runEntryStage(
  type: ChannelType,
  fixed: Record<string, number>,
  s: Record<string, number>,
): number {
  switch (CHANNEL_META[type].archetype) {
    case 'cpm': {
      // impressions = (budget / cpm) * 1000; clicks = impressions * ctr
      const impressions = safeDiv(fixed.budget ?? 0, s.cpm) * 1000;
      return impressions * s.ctr;
    }
    case 'cpc':
      // clicks = budget / cpc
      return safeDiv(fixed.budget ?? 0, s.cpc);
    case 'organic_reach': {
      // impressions = followers * reachRate * numPosts; clicks = impressions * linkCtr
      const impressions = (fixed.followers ?? 0) * s.reachRate * (fixed.numPosts ?? 0);
      return impressions * s.linkCtr;
    }
    case 'email':
      // visitors = listSize * openRate * clickRate
      return (fixed.listSize ?? 0) * s.openRate * s.clickRate;
    case 'flat_reach':
      // visitors = reach * linkCtr (reach and fee are fixed)
      return (fixed.reach ?? 0) * s.linkCtr;
    case 'search_volume':
      // visitors = monthly search volume * your click share
      return (fixed.searchVolume ?? 0) * s.rankCtr;
  }
}

/**
 * Full funnel for one draw (§5.1–5.2): entry stage → visitors, then the shared
 * downstream signups / payingUsers.
 */
export function runFunnel(
  type: ChannelType,
  fixed: Record<string, number>,
  s: Record<string, number>,
): FunnelDraw {
  const visitors = Math.max(0, runEntryStage(type, fixed, s));
  const signups = visitors * (s.signupRate ?? 0);
  const payingUsers = signups * (s.paidConversionRate ?? 0);
  return { visitors, signups, payingUsers };
}

/** Deterministic spend for a node (§5.3): the spend fixed input, or 0 if free. */
export function totalSpendFor(type: ChannelType, fixed: Record<string, number>): number {
  const input = CHANNEL_META[type].spendInput;
  return input ? (fixed[input] ?? 0) : 0;
}
