// Monte Carlo per node (§5.4) + campaign aggregate (§5.5).
//
// The honesty of the ranges lives here. We do NOT min/max multiply (that wildly
// overstates the range). Instead we run the full funnel N times with sampled
// assumptions and report percentiles of the resulting distribution. The
// campaign aggregate sums ACROSS NODES PER DRAW INDEX, then takes percentiles —
// which correctly narrows the summed range versus naively adding node ranges.

import type {
  CampaignSummary,
  CampaignTotals,
  ChannelNode,
  ChannelResults,
  Confidence,
  HistogramBin,
  NodeDetail,
  Range,
  SensitivityEntry,
  SimulationOutput,
} from './types';
import { hashString, mulberry32, sampleTriangular } from './rng';
import { CHANNEL_META, isPaid, runFunnel, totalSpendFor } from './funnel';

export const N_DRAWS = 2000;

/** Raw per-draw arrays for one node (length N). */
export interface NodeDraws {
  visitors: number[];
  signups: number[];
  payingUsers: number[];
}

/**
 * Stable seed string from a node's state. Includes the node id so two nodes
 * with identical assumptions still get independent RNG streams (required for
 * the aggregate range to narrow). Excludes label/position — cosmetic changes
 * must not move the numbers.
 */
function nodeSeedString(node: ChannelNode): string {
  const meta = CHANNEL_META[node.type];
  const fixed = meta.fixedInputs.map((k) => `${k}=${node.fixedInputs[k] ?? 0}`).join(',');
  const assume = meta.assumptionKeys
    .map((k) => {
      const u = node.assumptions[k];
      return u ? `${k}:${u.low}/${u.expected}/${u.high}` : `${k}:_`;
    })
    .join(',');
  return `${node.id}|${node.type}|${fixed}|${assume}`;
}

/** Linear-interpolation percentile (numpy default). `sortedAsc` ascending. */
function percentile(sortedAsc: number[], p: number): number {
  const n = sortedAsc.length;
  if (n === 0) return 0;
  if (n === 1) return sortedAsc[0];
  const idx = (n - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sortedAsc[lo];
  const frac = idx - lo;
  return sortedAsc[lo] * (1 - frac) + sortedAsc[hi] * frac;
}

/** Sort a copy and extract the P10 / P50 / P90 range. */
function toRange(values: number[]): Range {
  const sorted = values.slice().sort((a, b) => a - b);
  return {
    p10: percentile(sorted, 0.1),
    p50: percentile(sorted, 0.5),
    p90: percentile(sorted, 0.9),
  };
}

/**
 * Run N Monte Carlo draws for a node (§5.4). Samples every uncertain assumption
 * from its triangular distribution using a seeded generator, runs the full
 * funnel, and collects the per-draw outputs.
 */
export function simulateNodeDraws(node: ChannelNode, N: number = N_DRAWS): NodeDraws {
  const meta = CHANNEL_META[node.type];
  const rng = mulberry32(hashString(nodeSeedString(node)));

  const visitors = new Array<number>(N);
  const signups = new Array<number>(N);
  const payingUsers = new Array<number>(N);

  const sampled: Record<string, number> = {};
  for (let i = 0; i < N; i++) {
    for (const key of meta.assumptionKeys) {
      const u = node.assumptions[key];
      if (!u) {
        sampled[key] = 0;
        continue;
      }
      const [lo, mode, hi] = normBounds(u);
      sampled[key] = sampleTriangular(lo, mode, hi, rng());
    }
    const draw = runFunnel(node.type, node.fixedInputs, sampled);
    visitors[i] = draw.visitors;
    signups[i] = draw.signups;
    payingUsers[i] = draw.payingUsers;
  }

  return { visitors, signups, payingUsers };
}

/** Normalize a triangular's bounds so out-of-order user edits can't make NaN. */
function normBounds(u: { low: number; expected: number; high: number }): [number, number, number] {
  const lo = Math.min(u.low, u.high);
  const hi = Math.max(u.low, u.high);
  const mode = Math.min(Math.max(u.expected, lo), hi);
  return [lo, mode, hi];
}

/** Per-draw cost array for a paid group: spend / payingUsers, skipping 0 draws. */
function costPerPayingDraws(totalSpend: number, payingUsers: number[]): number[] | undefined {
  if (totalSpend <= 0) return undefined; // organic / no spend → omit the band
  const costs: number[] = [];
  for (const p of payingUsers) {
    if (p > 0) costs.push(totalSpend / p);
  }
  return costs.length > 0 ? costs : undefined;
}

/** Turn one node's raw draws into reported results (pure — no RNG). */
export function summarizeDraws(node: ChannelNode, draws: NodeDraws): ChannelResults {
  const meta = CHANNEL_META[node.type];
  const totalSpend = totalSpendFor(node.type, node.fixedInputs);
  const costDraws = costPerPayingDraws(totalSpend, draws.payingUsers);
  const confidence: Confidence = meta.confidence;

  return {
    visitors: toRange(draws.visitors),
    signups: toRange(draws.signups),
    payingUsers: toRange(draws.payingUsers),
    totalSpend,
    costPerPayingUser: costDraws ? toRange(costDraws) : undefined,
    confidence,
  };
}

/** Convenience: simulate one node end to end. */
export function simulateNode(node: ChannelNode, N: number = N_DRAWS): ChannelResults {
  return summarizeDraws(node, simulateNodeDraws(node, N));
}

interface NodeWithDraws {
  node: ChannelNode;
  draws: NodeDraws;
}

/**
 * Aggregate a group of nodes (§5.5): sum across nodes per draw index, then take
 * percentiles of the summed distribution. This is what makes the summed range
 * narrower than the sum of the individual ranges.
 */
function aggregateGroup(group: NodeWithDraws[], N: number): CampaignTotals {
  const visitors = new Array<number>(N).fill(0);
  const signups = new Array<number>(N).fill(0);
  const payingUsers = new Array<number>(N).fill(0);
  let totalSpend = 0;

  for (const { node, draws } of group) {
    totalSpend += totalSpendFor(node.type, node.fixedInputs);
    for (let i = 0; i < N; i++) {
      visitors[i] += draws.visitors[i];
      signups[i] += draws.signups[i];
      payingUsers[i] += draws.payingUsers[i];
    }
  }

  const costDraws = costPerPayingDraws(totalSpend, payingUsers);
  return {
    visitors: toRange(visitors),
    signups: toRange(signups),
    payingUsers: toRange(payingUsers),
    totalSpend,
    costPerPayingUser: costDraws ? toRange(costDraws) : undefined,
    nodeCount: group.length,
  };
}

/**
 * Simulate an entire project once: returns each node's results AND the campaign
 * summary (total + paid + organic subtotals) from the same set of draws, so the
 * UI never double-simulates. The paid/organic seam is always preserved.
 */
export function simulateCampaign(nodes: ChannelNode[], N: number = N_DRAWS): SimulationOutput {
  const withDraws: NodeWithDraws[] = nodes.map((node) => ({
    node,
    draws: simulateNodeDraws(node, N),
  }));

  const nodeResults: Record<string, ChannelResults> = {};
  for (const { node, draws } of withDraws) {
    nodeResults[node.id] = summarizeDraws(node, draws);
  }

  // "Paid" = spend-backed; the other group is everything free (organic + owned).
  const paidGroup = withDraws.filter((w) => isPaid(w.node.type));
  const organicGroup = withDraws.filter((w) => !isPaid(w.node.type));

  const summary: CampaignSummary = {
    total: aggregateGroup(withDraws, N),
    paid: aggregateGroup(paidGroup, N),
    organic: aggregateGroup(organicGroup, N),
  };

  return { nodeResults, summary };
}

// ---------------------------------------------------------------------------
// On-demand detail for a selected node: the real distribution shape + a
// variance-based sensitivity rank. This surfaces what the engine actually did.
// ---------------------------------------------------------------------------

/**
 * Draw the paying-users array, optionally pinning one assumption to its mode.
 * The RNG is always consumed for every key so baseline and pinned variants use
 * common random numbers — the only difference is the pinned variable.
 */
function drawPaying(node: ChannelNode, N: number, pinned?: string): number[] {
  const meta = CHANNEL_META[node.type];
  const rng = mulberry32(hashString(nodeSeedString(node)));
  const out = new Array<number>(N);
  const s: Record<string, number> = {};
  for (let i = 0; i < N; i++) {
    for (const key of meta.assumptionKeys) {
      const u = node.assumptions[key];
      if (!u) {
        s[key] = 0;
        continue;
      }
      const [lo, mode, hi] = normBounds(u);
      const sample = sampleTriangular(lo, mode, hi, rng()); // always consume rng
      s[key] = key === pinned ? mode : sample;
    }
    out[i] = runFunnel(node.type, node.fixedInputs, s).payingUsers;
  }
  return out;
}

function buildHistogram(values: number[], bins = 24): HistogramBin[] {
  const sorted = values.slice().sort((a, b) => a - b);
  // Cap the top edge at P98 so a single long-shot draw doesn't flatten the view;
  // overflow lands in the last bin (the upside is still represented).
  const hi = Math.max(percentile(sorted, 0.98), 1e-9);
  const width = hi / bins;
  const out: HistogramBin[] = [];
  for (let b = 0; b < bins; b++) {
    out.push({ x0: b * width, x1: (b + 1) * width, count: 0 });
  }
  for (const v of values) {
    const idx = Math.min(bins - 1, Math.max(0, Math.floor(v / width)));
    out[idx].count += 1;
  }
  return out;
}

/**
 * Rank assumptions by how much each drives the spread. Pinning an assumption to
 * its mode (common random numbers) collapses the part of the P10–P90 spread it
 * was responsible for; we normalize those reductions into shares that sum to 1.
 */
function computeSensitivity(node: ChannelNode, N: number, baseWidth: number): SensitivityEntry[] {
  const keys = CHANNEL_META[node.type].assumptionKeys.filter((k) => {
    const u = node.assumptions[k];
    return u && u.low !== u.high; // a fixed assumption contributes no spread
  });

  const raw = keys.map((key) => {
    const pinned = drawPaying(node, N, key).sort((a, b) => a - b);
    const pinnedWidth = percentile(pinned, 0.9) - percentile(pinned, 0.1);
    return { key, reduction: Math.max(0, baseWidth - pinnedWidth) };
  });

  const total = raw.reduce((acc, r) => acc + r.reduction, 0);
  return raw
    .map((r) => ({ key: r.key, contribution: total > 0 ? r.reduction / total : 0 }))
    .sort((a, b) => b.contribution - a.contribution);
}

export function simulateNodeDetail(node: ChannelNode, N: number = N_DRAWS): NodeDetail {
  const paying = drawPaying(node, N);
  const sorted = paying.slice().sort((a, b) => a - b);
  const range: Range = {
    p10: percentile(sorted, 0.1),
    p50: percentile(sorted, 0.5),
    p90: percentile(sorted, 0.9),
  };
  const mean = paying.reduce((acc, v) => acc + v, 0) / (paying.length || 1);
  const baseWidth = range.p90 - range.p10;
  const relativeSpread = range.p50 > 0 ? baseWidth / range.p50 : 0;

  return {
    draws: N,
    histogram: buildHistogram(paying),
    mean,
    range,
    relativeSpread,
    sensitivity: computeSensitivity(node, N, baseWidth),
  };
}
