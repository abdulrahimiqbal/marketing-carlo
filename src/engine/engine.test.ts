// §14 acceptance criteria for the engine. Must pass before any UI.
import { describe, it, expect } from 'vitest';
import { sampleTriangular, mulberry32, hashString } from './rng';
import { runFunnel, CHANNEL_META, isPaid } from './funnel';
import {
  simulateNode,
  simulateNodeDraws,
  simulateCampaign,
  simulateNodeDetail,
  N_DRAWS,
} from './simulate';
import type { ChannelNode } from './types';
import { createChannelNode, CHANNEL_TYPES } from '../benchmarks/presets';

describe('sampleTriangular (§5.4)', () => {
  it('returns the point when low == mode == high', () => {
    expect(sampleTriangular(2, 2, 2)).toBe(2);
    expect(sampleTriangular(2, 2, 2, 0)).toBe(2);
    expect(sampleTriangular(2, 2, 2, 0.999)).toBe(2);
  });

  it('always falls within [low, high] for (1,2,5)', () => {
    const rng = mulberry32(123);
    for (let i = 0; i < 20000; i++) {
      const x = sampleTriangular(1, 2, 5, rng());
      expect(x).toBeGreaterThanOrEqual(1);
      expect(x).toBeLessThanOrEqual(5);
    }
  });

  it('respects the boundary draws u=0 and u→1', () => {
    expect(sampleTriangular(1, 2, 5, 0)).toBeCloseTo(1, 10);
    expect(sampleTriangular(1, 2, 5, 1)).toBeCloseTo(5, 10);
  });
});

describe('mulberry32 is deterministic', () => {
  it('same seed yields the same sequence', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    for (let i = 0; i < 100; i++) expect(a()).toBe(b());
  });

  it('produces floats in [0, 1)', () => {
    const r = mulberry32(7);
    for (let i = 0; i < 1000; i++) {
      const x = r();
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
    }
  });
});

const META_NODE = (): ChannelNode => createChannelNode('meta_ads', 'b2b_saas', { x: 0, y: 0 }, 'meta-1');

describe('seeded reproducibility (§14)', () => {
  it('identical node inputs always yield identical P10/P50/P90', () => {
    const r1 = simulateNode(META_NODE());
    const r2 = simulateNode(META_NODE());
    expect(r1.payingUsers).toEqual(r2.payingUsers);
    expect(r1.visitors).toEqual(r2.visitors);
    expect(r1.signups).toEqual(r2.signups);
    expect(r1.costPerPayingUser).toEqual(r2.costPerPayingUser);
  });

  it('different node ids give independent streams (different draws)', () => {
    const a = simulateNodeDraws(createChannelNode('meta_ads', 'b2b_saas', { x: 0, y: 0 }, 'a'));
    const b = simulateNodeDraws(createChannelNode('meta_ads', 'b2b_saas', { x: 0, y: 0 }, 'b'));
    expect(a.payingUsers).not.toEqual(b.payingUsers);
  });

  it('label/position changes do not move the numbers', () => {
    const base = META_NODE();
    const moved: ChannelNode = { ...base, label: 'Renamed', position: { x: 999, y: 42 } };
    expect(simulateNode(moved).payingUsers).toEqual(simulateNode(base).payingUsers);
  });
});

describe('Meta node, $1000 budget, b2b_saas defaults (§14)', () => {
  it('P50 paying users is positive and finite; P10 < P50 < P90; P10 >= 0', () => {
    const r = simulateNode(META_NODE());
    expect(Number.isFinite(r.payingUsers.p50)).toBe(true);
    expect(r.payingUsers.p50).toBeGreaterThan(0);
    expect(r.payingUsers.p10).toBeGreaterThanOrEqual(0);
    expect(r.payingUsers.p10).toBeLessThan(r.payingUsers.p50);
    expect(r.payingUsers.p50).toBeLessThan(r.payingUsers.p90);
  });

  it('paid channel reports spend = budget and a cost-per-paying band', () => {
    const r = simulateNode(META_NODE());
    expect(r.totalSpend).toBe(1000);
    expect(r.costPerPayingUser).toBeDefined();
    expect(Number.isFinite(r.costPerPayingUser!.p50)).toBe(true);
    expect(r.confidence).toBe('estimated');
  });
});

describe('Google node uses CPC entry, not CPM (§14)', () => {
  it('clicks = budget / cpc (degenerate assumptions make this exact)', () => {
    // Collapse every assumption to a point so the funnel is deterministic.
    const node: ChannelNode = {
      id: 'g1',
      type: 'google_search',
      label: 'Google',
      position: { x: 0, y: 0 },
      fixedInputs: { budget: 1000 },
      assumptions: {
        cpc: { low: 2, expected: 2, high: 2 },
        signupRate: { low: 0.05, expected: 0.05, high: 0.05 },
        paidConversionRate: { low: 0.03, expected: 0.03, high: 0.03 },
      },
    };
    const r = simulateNode(node);
    // budget/cpc = 1000/2 = 500 visitors exactly
    expect(r.visitors.p50).toBeCloseTo(500, 6);
    expect(r.visitors.p10).toBeCloseTo(500, 6);
    expect(r.signups.p50).toBeCloseTo(25, 6); // 500 * 0.05
    expect(r.payingUsers.p50).toBeCloseTo(0.75, 6); // 25 * 0.03
  });

  it('google_search is configured for cpc, not cpm', () => {
    expect(CHANNEL_META.google_search.assumptionKeys).toContain('cpc');
    expect(CHANNEL_META.google_search.assumptionKeys).not.toContain('cpm');
  });
});

describe('Organic node (§14)', () => {
  it('spend = 0 and cost-per-paying is omitted (no Infinity / NaN)', () => {
    const node = createChannelNode('x_organic', 'b2b_saas', { x: 0, y: 0 }, 'x1');
    const r = simulateNode(node);
    expect(r.totalSpend).toBe(0);
    expect(r.costPerPayingUser).toBeUndefined();
    expect(r.confidence).toBe('estimated_high_variance');
    expect(Number.isFinite(r.payingUsers.p50)).toBe(true);
  });
});

describe('Campaign aggregate (§5.5, §14)', () => {
  // Two independent paid nodes + one organic node.
  const nodes: ChannelNode[] = [
    createChannelNode('meta_ads', 'b2b_saas', { x: 0, y: 0 }, 'm1'),
    createChannelNode('google_search', 'b2b_saas', { x: 0, y: 0 }, 'gg1'),
    createChannelNode('x_organic', 'b2b_saas', { x: 0, y: 0 }, 'xx1'),
  ];

  it('campaign P50 ≈ sum of node P50s within Monte Carlo noise', () => {
    const { nodeResults, summary } = simulateCampaign(nodes);
    const sumP50 = nodes.reduce((acc, n) => acc + nodeResults[n.id].payingUsers.p50, 0);
    const rel = Math.abs(summary.total.payingUsers.p50 - sumP50) / sumP50;
    expect(rel).toBeLessThan(0.1); // within 10% — medians are not perfectly additive
  });

  it('campaign P90 < sum of node P90s (range narrows — not naive-added)', () => {
    const { nodeResults, summary } = simulateCampaign(nodes);
    const sumP90 = nodes.reduce((acc, n) => acc + nodeResults[n.id].payingUsers.p90, 0);
    expect(summary.total.payingUsers.p90).toBeLessThan(sumP90);
  });

  it('keeps paid and organic subtotals separate; total = paid + organic spend', () => {
    const { summary } = simulateCampaign(nodes);
    expect(summary.paid.totalSpend).toBe(2000); // two $1000 paid nodes
    expect(summary.organic.totalSpend).toBe(0);
    expect(summary.total.totalSpend).toBe(2000);
    expect(summary.organic.costPerPayingUser).toBeUndefined();
    expect(summary.paid.costPerPayingUser).toBeDefined();
  });

  it('empty campaign produces zeroed, finite totals', () => {
    const { summary } = simulateCampaign([]);
    expect(summary.total.payingUsers.p50).toBe(0);
    expect(summary.total.totalSpend).toBe(0);
    expect(summary.total.costPerPayingUser).toBeUndefined();
  });
});

describe('Performance (§14)', () => {
  it('N = 2000 and a 5-node project recomputes in < 100 ms', () => {
    expect(N_DRAWS).toBe(2000);
    const nodes: ChannelNode[] = [
      createChannelNode('meta_ads', 'b2b_saas', { x: 0, y: 0 }, 'p1'),
      createChannelNode('google_search', 'consumer_app', { x: 0, y: 0 }, 'p2'),
      createChannelNode('x_organic', 'ecommerce', { x: 0, y: 0 }, 'p3'),
      createChannelNode('meta_ads', 'ecommerce', { x: 0, y: 0 }, 'p4'),
      createChannelNode('google_search', 'b2b_saas', { x: 0, y: 0 }, 'p5'),
    ];
    const start = performance.now();
    simulateCampaign(nodes);
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(100);
  });
});

describe('hashString stability', () => {
  it('is deterministic and unsigned 32-bit', () => {
    expect(hashString('abc')).toBe(hashString('abc'));
    expect(hashString('abc')).toBeGreaterThanOrEqual(0);
    expect(hashString('abc')).not.toBe(hashString('abd'));
  });
});

describe('runFunnel basic shape', () => {
  it('produces non-negative monotone funnel (visitors >= signups >= paying)', () => {
    const s = { cpm: 10, ctr: 0.01, signupRate: 0.05, paidConversionRate: 0.03 };
    const d = runFunnel('meta_ads', { budget: 1000 }, s);
    expect(d.visitors).toBeGreaterThanOrEqual(d.signups);
    expect(d.signups).toBeGreaterThanOrEqual(d.payingUsers);
    expect(d.payingUsers).toBeGreaterThanOrEqual(0);
  });
});

describe('Expanded channel library', () => {
  it('every channel seeds a node that simulates to a finite, ordered funnel', () => {
    for (const type of CHANNEL_TYPES) {
      const node = createChannelNode(type, 'b2b_saas', { x: 0, y: 0 }, `seed-${type}`);
      const r = simulateNode(node);
      expect(Number.isFinite(r.payingUsers.p50)).toBe(true);
      expect(r.visitors.p50).toBeGreaterThanOrEqual(r.signups.p50);
      expect(r.signups.p50).toBeGreaterThanOrEqual(r.payingUsers.p50);
      expect(r.payingUsers.p10).toBeGreaterThanOrEqual(0);
    }
  });

  it('newsletter (email) uses list × open × click, spend 0, no cost band', () => {
    const node: ChannelNode = {
      id: 'nl1',
      type: 'newsletter',
      label: 'Email',
      position: { x: 0, y: 0 },
      fixedInputs: { listSize: 10000 },
      assumptions: {
        openRate: { low: 0.4, expected: 0.4, high: 0.4 },
        clickRate: { low: 0.05, expected: 0.05, high: 0.05 },
        signupRate: { low: 0.1, expected: 0.1, high: 0.1 },
        paidConversionRate: { low: 0.03, expected: 0.03, high: 0.03 },
      },
    };
    const r = simulateNode(node);
    expect(r.visitors.p50).toBeCloseTo(200, 4); // 10000 * 0.4 * 0.05
    expect(r.totalSpend).toBe(0);
    expect(r.costPerPayingUser).toBeUndefined();
    expect(r.confidence).toBe('estimated');
    expect(isPaid('newsletter')).toBe(false);
  });

  it('influencer (flat reach) spend = fee and has a cost-per-paying band', () => {
    const node = createChannelNode('influencer', 'b2b_saas', { x: 0, y: 0 }, 'inf1');
    const r = simulateNode(node);
    expect(r.totalSpend).toBe(500); // the fixed `cost` fee, not a budget
    expect(isPaid('influencer')).toBe(true);
    expect(r.costPerPayingUser).toBeDefined();
    expect(r.confidence).toBe('estimated_high_variance');
  });
});

describe('Node detail (distribution + sensitivity)', () => {
  const node = createChannelNode('meta_ads', 'b2b_saas', { x: 0, y: 0 }, 'detail1');

  it('histogram counts sum to N and the range matches the results', () => {
    const detail = simulateNodeDetail(node);
    const total = detail.histogram.reduce((acc, b) => acc + b.count, 0);
    expect(total).toBe(N_DRAWS);
    expect(detail.range.p10).toBeLessThan(detail.range.p50);
    expect(detail.range.p50).toBeLessThan(detail.range.p90);
    expect(detail.mean).toBeGreaterThan(0);
    expect(detail.relativeSpread).toBeGreaterThan(0);
  });

  it('sensitivity contributions are shares in [0,1] that sum to ~1', () => {
    const detail = simulateNodeDetail(node);
    let sum = 0;
    for (const s of detail.sensitivity) {
      expect(s.contribution).toBeGreaterThanOrEqual(0);
      expect(s.contribution).toBeLessThanOrEqual(1);
      sum += s.contribution;
    }
    expect(sum).toBeCloseTo(1, 5);
  });

  it('the only assumption with spread dominates the sensitivity', () => {
    // CPC is the sole uncertain input; the rest are pinned to points.
    const g: ChannelNode = {
      id: 'g-sens',
      type: 'google_search',
      label: 'G',
      position: { x: 0, y: 0 },
      fixedInputs: { budget: 1000 },
      assumptions: {
        cpc: { low: 1, expected: 3, high: 8 },
        signupRate: { low: 0.05, expected: 0.05, high: 0.05 },
        paidConversionRate: { low: 0.03, expected: 0.03, high: 0.03 },
      },
    };
    const detail = simulateNodeDetail(g);
    expect(detail.sensitivity[0].key).toBe('cpc');
    expect(detail.sensitivity[0].contribution).toBeCloseTo(1, 5);
  });
});
