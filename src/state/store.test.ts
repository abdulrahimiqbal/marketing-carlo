// Product-level behavior (§14) that lives in the store, tested headlessly.
import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from './store';

beforeEach(() => useStore.getState().resetProject());

describe('store lifecycle', () => {
  it('starts empty with zeroed, finite totals', () => {
    const s = useStore.getState();
    expect(s.project.nodes).toHaveLength(0);
    expect(s.summary.total.payingUsers.p50).toBe(0);
    expect(s.summary.total.totalSpend).toBe(0);
  });

  it('addNode adds a node, computes its results, selects it, updates the summary', () => {
    useStore.getState().addNode('meta_ads');
    const s = useStore.getState();
    expect(s.project.nodes).toHaveLength(1);
    const id = s.project.nodes[0].id;
    expect(s.nodeResults[id]?.payingUsers.p50).toBeGreaterThan(0);
    expect(s.selectedNodeId).toBe(id);
    expect(s.summary.paid.nodeCount).toBe(1);
    expect(s.summary.paid.totalSpend).toBe(1000);
  });

  it('keeps paid and organic subtotals separate (§14)', () => {
    const st = useStore.getState();
    st.addNode('meta_ads');
    st.addNode('x_organic');
    const s = useStore.getState();
    expect(s.summary.paid.nodeCount).toBe(1);
    expect(s.summary.organic.nodeCount).toBe(1);
    expect(s.summary.organic.totalSpend).toBe(0);
    expect(s.summary.organic.costPerPayingUser).toBeUndefined();
    expect(s.summary.paid.costPerPayingUser).toBeDefined();
  });

  it('editing an assumption recomputes the node live (§14)', () => {
    const st = useStore.getState();
    st.addNode('meta_ads');
    const id = useStore.getState().project.nodes[0].id;
    const before = useStore.getState().nodeResults[id].visitors.p50;
    const ctr = useStore.getState().project.nodes[0].assumptions.ctr.expected;
    st.setAssumptionField(id, 'ctr', 'expected', ctr * 2);
    const after = useStore.getState().nodeResults[id].visitors.p50;
    expect(after).toBeGreaterThan(before);
  });

  it('changing vertical does NOT overwrite existing node assumptions (§14)', () => {
    const st = useStore.getState();
    st.addNode('meta_ads'); // b2b_saas defaults
    const cpmBefore = { ...useStore.getState().project.nodes[0].assumptions.cpm };
    st.setVertical('consumer_app');
    expect(useStore.getState().project.vertical).toBe('consumer_app');
    expect(useStore.getState().project.nodes[0].assumptions.cpm).toEqual(cpmBefore);
  });

  it('reseedAllNodes explicitly resets assumptions to the new benchmarks', () => {
    const st = useStore.getState();
    st.addNode('meta_ads');
    st.reseedAllNodes('consumer_app');
    expect(useStore.getState().project.nodes[0].assumptions.cpm).toEqual({
      low: 6,
      expected: 10,
      high: 16,
    });
  });

  it('reset-to-benchmark restores the seeded value after an edit', () => {
    const st = useStore.getState();
    st.addNode('meta_ads');
    const id = useStore.getState().project.nodes[0].id;
    st.setAssumptionField(id, 'cpm', 'expected', 99);
    expect(useStore.getState().project.nodes[0].assumptions.cpm.expected).toBe(99);
    st.resetAssumptionToBenchmark(id, 'cpm');
    expect(useStore.getState().project.nodes[0].assumptions.cpm).toEqual({
      low: 9,
      expected: 14,
      high: 22,
    });
  });

  it('removing the selected node clears selection', () => {
    const st = useStore.getState();
    st.addNode('meta_ads');
    const id = useStore.getState().project.nodes[0].id;
    st.removeNode(id);
    expect(useStore.getState().selectedNodeId).toBeNull();
    expect(useStore.getState().project.nodes).toHaveLength(0);
  });

  it('importProject replaces the project, clears selection, and recomputes', () => {
    const st = useStore.getState();
    st.addNode('meta_ads');
    const imported = {
      id: 'imp',
      name: 'Imported',
      vertical: 'ecommerce' as const,
      nodes: [],
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    };
    st.importProject(imported);
    const s = useStore.getState();
    expect(s.project.name).toBe('Imported');
    expect(s.project.vertical).toBe('ecommerce');
    expect(s.project.nodes).toHaveLength(0);
    expect(s.selectedNodeId).toBeNull();
    expect(s.summary.total.payingUsers.p50).toBe(0);
  });

  it('moving a node does not change its computed numbers', () => {
    const st = useStore.getState();
    st.addNode('meta_ads');
    const id = useStore.getState().project.nodes[0].id;
    const before = useStore.getState().nodeResults[id].payingUsers;
    st.updateNodePosition(id, { x: 999, y: 123 });
    st.recompute();
    expect(useStore.getState().nodeResults[id].payingUsers).toEqual(before);
  });
});
