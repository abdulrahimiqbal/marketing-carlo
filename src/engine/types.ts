// All core interfaces (§4). The engine math depends on these being precise.

export type Vertical = 'b2b_saas' | 'consumer_app' | 'ecommerce';

export type ChannelType = 'meta_ads' | 'google_search' | 'x_organic';

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
