// Entry stages + downstream funnel (§5.1–5.3).
// All channels reduce to the same downstream funnel; only the entry stage
// differs. These are pure functions over one set of sampled assumption values.

import type { ChannelType } from './types';

/**
 * Single source of truth for each channel's structure: whether it is paid, its
 * fixed inputs, and which assumption keys it samples. The sampling order is
 * fixed (array order) so the seeded RNG stays reproducible. Downstream keys
 * (signupRate, paidConversionRate) are shared by every channel.
 */
export const CHANNEL_META: Record<
  ChannelType,
  { paid: boolean; fixedInputs: string[]; assumptionKeys: string[] }
> = {
  meta_ads: {
    paid: true,
    fixedInputs: ['budget'],
    assumptionKeys: ['cpm', 'ctr', 'signupRate', 'paidConversionRate'],
  },
  google_search: {
    paid: true,
    fixedInputs: ['budget'],
    assumptionKeys: ['cpc', 'signupRate', 'paidConversionRate'],
  },
  x_organic: {
    paid: false,
    fixedInputs: ['followers', 'numPosts'],
    assumptionKeys: ['reachRate', 'linkCtr', 'signupRate', 'paidConversionRate'],
  },
};

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
 * Channel-specific entry stage → visitors (§5.1). Bounce is folded into the
 * downstream signupRate; there is no separate click→site stage in v1.
 */
export function runEntryStage(
  type: ChannelType,
  fixed: Record<string, number>,
  s: Record<string, number>,
): number {
  switch (type) {
    case 'meta_ads': {
      // impressions = (budget / cpm) * 1000; clicks = impressions * ctr
      const impressions = safeDiv(fixed.budget ?? 0, s.cpm) * 1000;
      return impressions * s.ctr;
    }
    case 'google_search': {
      // clicks = budget / cpc
      return safeDiv(fixed.budget ?? 0, s.cpc);
    }
    case 'x_organic': {
      // impressions = followers * reachRate * numPosts; clicks = impressions * linkCtr
      const impressions = (fixed.followers ?? 0) * s.reachRate * (fixed.numPosts ?? 0);
      return impressions * s.linkCtr;
    }
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

/** Deterministic spend for a node (§5.3): budget for paid, 0 for organic. */
export function totalSpendFor(type: ChannelType, fixed: Record<string, number>): number {
  return CHANNEL_META[type].paid ? (fixed.budget ?? 0) : 0;
}
