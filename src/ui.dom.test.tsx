// @vitest-environment jsdom
// Render smoke tests for the honesty-critical UI (§14). These do not depend on
// React Flow's DOM measurement, so they verify the real component tree mounts
// and shows ranges + badges + the paid/organic seam.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import App from './App';
import { Inspector } from './components/Inspector';
import { CampaignSummary } from './components/CampaignSummary';
import { ConfidenceBadge } from './components/ConfidenceBadge';
import { Toolbar } from './components/Toolbar';
import { useStore } from './state/store';
import { encodeProject, loadSharedProject, clearShareHash } from './lib/share';

// Recharts' ResponsiveContainer needs ResizeObserver.
class RO {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(globalThis as unknown as { ResizeObserver: typeof RO }).ResizeObserver = RO;

beforeEach(() => useStore.getState().resetProject());
afterEach(() => cleanup());

describe('App mounts (full tree, no runtime crash)', () => {
  it('renders the shell, the engine status, and the full channel library', () => {
    render(<App />);
    expect(screen.getByText('Campaign Canvas')).toBeTruthy();
    expect(
      screen.getByText(/Add your first channel to see the users before you spend/i),
    ).toBeTruthy();
    // The Monte Carlo engine is surfaced honestly.
    expect(screen.getByText('Monte Carlo engine')).toBeTruthy();
    // Breadth: channels beyond the original three are offered.
    expect(screen.getByTitle('Add Meta Ads')).toBeTruthy();
    expect(screen.getByTitle('Add TikTok Ads')).toBeTruthy();
    expect(screen.getByTitle('Add Newsletter / Email')).toBeTruthy();
    expect(screen.getByTitle('Add Influencer / Sponsored')).toBeTruthy();
  });
});

describe('Channel picker (grouped, §expansion)', () => {
  it('opens a grouped menu with the new channels', () => {
    render(<Toolbar />);
    fireEvent.click(screen.getByText('Add channel'));
    expect(screen.getByText('LinkedIn Ads')).toBeTruthy();
    expect(screen.getByText('YouTube Ads')).toBeTruthy();
    expect(screen.getByText('SEO / Content')).toBeTruthy();
    expect(screen.getByText('Cold Email')).toBeTruthy();
    expect(screen.getByText('Product Hunt')).toBeTruthy();
  });
});

describe('Shareable links', () => {
  it('round-trips a project through the URL hash and clears it', () => {
    const project = useStore.getState().project;
    window.location.hash = `#p=${encodeProject(project)}`;
    expect(loadSharedProject()?.id).toBe(project.id);
    clearShareHash();
    expect(window.location.hash).toBe('');
    expect(loadSharedProject()).toBeNull();
  });
});

describe('ConfidenceBadge (§8)', () => {
  it('shows the paid assumption-based badge', () => {
    render(<ConfidenceBadge confidence="estimated" withTooltip={false} />);
    expect(screen.getByText('Estimated · assumption-based')).toBeTruthy();
  });

  it('shows the organic high-variance badge with the §8 tooltip copy', () => {
    render(<ConfidenceBadge confidence="estimated_high_variance" />);
    expect(screen.getByText('Estimated · high variance')).toBeTruthy();
    // The §8 tooltip copy is present (power-law lottery wording)
    expect(screen.getAllByText(/power-law lottery/i).length).toBeGreaterThan(0);
  });
});

describe('CampaignSummary keeps the paid/organic seam (§14)', () => {
  it('shows separate Paid and Organic subtotals once channels exist', () => {
    const st = useStore.getState();
    st.addNode('meta_ads');
    st.addNode('x_organic');
    render(<CampaignSummary />);
    expect(screen.getByText('Total paying users')).toBeTruthy();
    expect(screen.getByText('Paid')).toBeTruthy();
    expect(screen.getByText('Organic')).toBeTruthy();
    // P50 is always labelled and shown with a range (no lone integer)
    expect(screen.getAllByText('most likely').length).toBeGreaterThan(0);
    expect(screen.getAllByText('pessimistic').length).toBeGreaterThan(0);
    expect(screen.getAllByText('optimistic').length).toBeGreaterThan(0);
  });
});

describe('Inspector shows results with range + badge + actuals (§7.2, §10)', () => {
  it('renders a paid node with cost-per-paying and a badge', () => {
    useStore.getState().addNode('meta_ads');
    const node = useStore.getState().project.nodes[0];
    render(<Inspector node={node} vertical="b2b_saas" />);
    expect(screen.getByText('Estimated · assumption-based')).toBeTruthy();
    // "Paying users" appears in both the Results and Actuals sections.
    expect(screen.getAllByText('Paying users').length).toBeGreaterThan(0);
    expect(screen.getByText('Cost per paying user')).toBeTruthy();
    expect(screen.getByText(/Actuals/i)).toBeTruthy();
    // The §11 message check is organic-only — not shown on paid nodes.
    expect(screen.queryByText('Message check')).toBeNull();
    // Monte Carlo power surfaced: distribution + sensitivity.
    expect(screen.getByText(/simulations/i)).toBeTruthy();
    expect(screen.getByText('What drives the uncertainty')).toBeTruthy();
  });

  it('organic node shows the high-variance explainer and omits cost-per-paying', () => {
    useStore.getState().addNode('x_organic');
    const node = useStore.getState().project.nodes[0];
    render(<Inspector node={node} vertical="b2b_saas" />);
    expect(screen.getByText('Estimated · high variance')).toBeTruthy();
    expect(screen.getByText(/no spend/i)).toBeTruthy();
    // The §11 qualitative message check appears on organic nodes.
    expect(screen.getByText('Message check')).toBeTruthy();
    expect(screen.getByText('Qualitative check')).toBeTruthy();
  });

  it('editing the budget updates the displayed cost basis live', () => {
    useStore.getState().addNode('meta_ads');
    const node = useStore.getState().project.nodes[0];
    render(<Inspector node={node} vertical="b2b_saas" />);
    const budget = screen.getByLabelText('budget') as HTMLInputElement;
    fireEvent.change(budget, { target: { value: '5000' } });
    expect(useStore.getState().project.nodes[0].fixedInputs.budget).toBe(5000);
  });
});

describe('Ecommerce stage rename (§6 hint)', () => {
  it('relabels signup/paying stages in the inspector', () => {
    const st = useStore.getState();
    st.setVertical('ecommerce');
    st.addNode('meta_ads');
    const node = useStore.getState().project.nodes[0];
    render(<Inspector node={node} vertical="ecommerce" />);
    expect(screen.getAllByText('Purchases').length).toBeGreaterThan(0);
    expect(screen.getByText('Cost per purchase')).toBeTruthy();
  });
});
