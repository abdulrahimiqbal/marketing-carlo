// All core interfaces (§4). The engine math depends on these being precise.

export type Vertical = 'b2b_saas' | 'consumer_app' | 'ecommerce';

export type ChannelType =
  // Paid — CPM auction (impressions → clicks)
  | 'meta_ads'
  | 'tiktok_ads'
  | 'linkedin_ads'
  | 'reddit_ads'
  | 'youtube_ads'
  | 'pinterest_ads'
  | 'snapchat_ads'
  // Paid — CPC (clicks bought directly)
  | 'google_search'
  | 'bing_ads'
  // Organic — owned reach (followers × reach × posts)
  | 'x_organic'
  | 'linkedin_organic'
  | 'instagram_organic'
  | 'tiktok_organic'
  // Organic — earned (launch spike, search)
  | 'product_hunt'
  | 'seo_content'
  // Owned list — email
  | 'newsletter'
  | 'cold_email'
  // Paid — flat sponsorship (fixed reach for a fixed fee)
  | 'influencer';

/** How the entry stage turns inputs into visitors. */
export type FunnelArchetype =
  | 'cpm'
  | 'cpc'
  | 'organic_reach'
  | 'email'
  | 'flat_reach'
  | 'search_volume';

/** Grouping for the channel picker. */
export type ChannelGroup = 'paid' | 'organic' | 'email';

/**
 * Confidence states (§8). `simulated_behavioral` is RESERVED for the v2
 * behavioral agent engine and must not be produced anywhere in v1 — badges
 * must describe what the engine actually did.
 */
export type Confidence =
  | 'estimated' // deterministic funnel over assumptions (paid channels)
  | 'estimated_high_variance' // organic — wide on purpose
  | 'simulated_behavioral'; // v2 ONLY — do not emit in v1

/** A range is always reported as percentiles of the Monte Carlo output. */
export interface Range {
  p10: number;
  p50: number;
  p90: number;
}

/** One uncertain assumption: a triangular distribution. */
export interface Uncertain {
  low: number;
  expected: number;
  high: number;
}

export interface ChannelResults {
  visitors: Range;
  signups: Range;
  payingUsers: Range;
  totalSpend: number; // deterministic (= budget for paid, 0 for organic)
  /** totalSpend / payingUsers per draw; undefined for organic (spend is 0). */
  costPerPayingUser?: Range;
  confidence: Confidence;
}

export interface Actuals {
  visitors?: number;
  signups?: number;
  payingUsers?: number;
}

export interface ChannelNode {
  id: string;
  type: ChannelType;
  label: string; // user-editable, e.g. "Launch tweet"
  position: { x: number; y: number };
  fixedInputs: Record<string, number>; // budget, followers, numPosts — set exactly
  assumptions: Record<string, Uncertain>; // CPM, CTR, signupRate, etc. — seeded, editable
  results?: ChannelResults; // computed, cached
  actuals?: Actuals; // post-launch, optional (§10)
}

export interface Project {
  id: string;
  name: string;
  vertical: Vertical;
  nodes: ChannelNode[];
  createdAt: string;
  updatedAt: string;
}

/** Totals for a group of channels (all / paid / organic). */
export interface CampaignTotals {
  visitors: Range;
  signups: Range;
  payingUsers: Range;
  totalSpend: number;
  /** Blended cost-per-paying for the group; undefined when group spend is 0. */
  costPerPayingUser?: Range;
  nodeCount: number;
}

/**
 * Campaign summary always keeps the paid/organic seam visible (§5.5, §7.3).
 * The product must never present a single blended number without the split.
 */
export interface CampaignSummary {
  total: CampaignTotals;
  paid: CampaignTotals;
  organic: CampaignTotals;
}

/** Full output of one simulation pass: per-node results + campaign summary. */
export interface SimulationOutput {
  nodeResults: Record<string, ChannelResults>; // keyed by node id
  summary: CampaignSummary;
}

/** One histogram bin of the Monte Carlo output distribution. */
export interface HistogramBin {
  x0: number; // bin lower edge
  x1: number; // bin upper edge
  count: number; // draws in this bin
}

/** How much one assumption drives the spread of the outcome (§ sensitivity). */
export interface SensitivityEntry {
  key: string;
  /** Fraction of the total P10–P90 spread removed by pinning this assumption (0..1). */
  contribution: number;
}

/**
 * Rich, on-demand detail for a single selected node — the actual shape of the
 * 2,000-draw paying-users distribution plus a variance-based sensitivity rank.
 * This exposes what the engine really did; it is not decoration.
 */
export interface NodeDetail {
  draws: number; // N
  histogram: HistogramBin[]; // paying users distribution
  mean: number;
  range: Range; // paying users P10/P50/P90 (matches results)
  /** (P90 − P10) / P50 — how wide the range is relative to the typical outcome. */
  relativeSpread: number;
  /** Assumptions ranked by how much each drives the uncertainty. */
  sensitivity: SensitivityEntry[];
}
