// Zustand store: project + selection + actions (§3). The project holds INPUTS
// only; simulation results are derived into `nodeResults` / `summary` and never
// persisted, so localStorage stays the source of truth for inputs alone.
import { create } from 'zustand';
import type {
  CampaignSummary,
  ChannelNode,
  ChannelResults,
  ChannelType,
  Project,
  Uncertain,
  Vertical,
} from '../engine/types';
import { simulateCampaign } from '../engine/simulate';
import { createChannelNode, benchmarkFor } from '../benchmarks/presets';
import { genId } from '../lib/id';
import { loadProject, saveProjectDebounced } from './persistence';
import { loadSharedProject, clearShareHash } from '../lib/share';

function nowIso(): string {
  return new Date().toISOString();
}

function createDefaultProject(): Project {
  const now = nowIso();
  return {
    id: genId(),
    name: 'Untitled launch',
    vertical: 'b2b_saas',
    nodes: [],
    createdAt: now,
    updatedAt: now,
  };
}

/** Cascade new nodes so they don't perfectly stack. */
function nextPosition(count: number): { x: number; y: number } {
  const col = count % 3;
  const row = Math.floor(count / 3);
  return { x: 80 + col * 300, y: 80 + row * 230 };
}

function mapNode(
  nodes: ChannelNode[],
  id: string,
  fn: (n: ChannelNode) => ChannelNode,
): ChannelNode[] {
  return nodes.map((n) => (n.id === id ? fn(n) : n));
}

export interface CanvasState {
  project: Project;
  nodeResults: Record<string, ChannelResults>;
  summary: CampaignSummary;
  selectedNodeId: string | null;
  /** Increments on every recompute — lets the UI reflect each real re-simulation. */
  simSeq: number;

  // derived recompute
  recompute: () => void;

  // node lifecycle
  addNode: (type: ChannelType) => void;
  removeNode: (id: string) => void;
  selectNode: (id: string | null) => void;

  // node edits
  updateNodePosition: (id: string, position: { x: number; y: number }) => void;
  updateNodeLabel: (id: string, label: string) => void;
  setFixedInput: (id: string, key: string, value: number) => void;
  setAssumptionField: (id: string, key: string, field: keyof Uncertain, value: number) => void;
  resetAssumptionToBenchmark: (id: string, key: string) => void;
  setActual: (id: string, key: 'visitors' | 'signups' | 'payingUsers', value: number | undefined) => void;

  // project edits
  setProjectName: (name: string) => void;
  setVertical: (vertical: Vertical) => void;
  reseedAllNodes: (vertical: Vertical) => void;
  resetProject: () => void;
  importProject: (project: Project) => void;
}

// A shared link (URL hash) wins over local storage; clear it so refresh/edits
// don't reload the shared copy over the user's subsequent work.
const sharedProject = loadSharedProject();
if (sharedProject) clearShareHash();
const initialProject = sharedProject ?? loadProject() ?? createDefaultProject();
const initialSim = simulateCampaign(initialProject.nodes);

export const useStore = create<CanvasState>((set, get) => ({
  project: initialProject,
  nodeResults: initialSim.nodeResults,
  summary: initialSim.summary,
  selectedNodeId: null,
  simSeq: 0,

  recompute: () => {
    const { project, simSeq } = get();
    const { nodeResults, summary } = simulateCampaign(project.nodes);
    set({ nodeResults, summary, simSeq: simSeq + 1 });
  },

  addNode: (type) => {
    set((state) => {
      const node = createChannelNode(type, state.project.vertical, nextPosition(state.project.nodes.length));
      return {
        project: { ...state.project, nodes: [...state.project.nodes, node], updatedAt: nowIso() },
        selectedNodeId: node.id,
      };
    });
    get().recompute();
  },

  removeNode: (id) => {
    set((state) => ({
      project: {
        ...state.project,
        nodes: state.project.nodes.filter((n) => n.id !== id),
        updatedAt: nowIso(),
      },
      selectedNodeId: state.selectedNodeId === id ? null : state.selectedNodeId,
    }));
    get().recompute();
  },

  selectNode: (id) => set({ selectedNodeId: id }),

  updateNodePosition: (id, position) =>
    set((state) => ({
      project: {
        ...state.project,
        nodes: mapNode(state.project.nodes, id, (n) => ({ ...n, position })),
      },
    })),

  updateNodeLabel: (id, label) =>
    set((state) => ({
      project: {
        ...state.project,
        nodes: mapNode(state.project.nodes, id, (n) => ({ ...n, label })),
        updatedAt: nowIso(),
      },
    })),

  setFixedInput: (id, key, value) => {
    set((state) => ({
      project: {
        ...state.project,
        nodes: mapNode(state.project.nodes, id, (n) => ({
          ...n,
          fixedInputs: { ...n.fixedInputs, [key]: value },
        })),
        updatedAt: nowIso(),
      },
    }));
    get().recompute();
  },

  setAssumptionField: (id, key, field, value) => {
    set((state) => ({
      project: {
        ...state.project,
        nodes: mapNode(state.project.nodes, id, (n) => {
          const current = n.assumptions[key];
          if (!current) return n;
          return { ...n, assumptions: { ...n.assumptions, [key]: { ...current, [field]: value } } };
        }),
        updatedAt: nowIso(),
      },
    }));
    get().recompute();
  },

  resetAssumptionToBenchmark: (id, key) => {
    set((state) => ({
      project: {
        ...state.project,
        nodes: mapNode(state.project.nodes, id, (n) => ({
          ...n,
          assumptions: {
            ...n.assumptions,
            [key]: benchmarkFor(n.type, state.project.vertical, key),
          },
        })),
        updatedAt: nowIso(),
      },
    }));
    get().recompute();
  },

  setActual: (id, key, value) =>
    set((state) => ({
      project: {
        ...state.project,
        nodes: mapNode(state.project.nodes, id, (n) => {
          const actuals = { ...(n.actuals ?? {}) };
          if (value === undefined || Number.isNaN(value)) delete actuals[key];
          else actuals[key] = value;
          return { ...n, actuals };
        }),
        updatedAt: nowIso(),
      },
    })),

  setProjectName: (name) =>
    set((state) => ({ project: { ...state.project, name, updatedAt: nowIso() } })),

  // Changing the vertical only affects NEW nodes — existing nodes are never
  // silently rewritten (§7.3). Bulk reseed is a separate, explicit action.
  setVertical: (vertical) =>
    set((state) => ({ project: { ...state.project, vertical, updatedAt: nowIso() } })),

  reseedAllNodes: (vertical) => {
    set((state) => ({
      project: {
        ...state.project,
        vertical,
        updatedAt: nowIso(),
        nodes: state.project.nodes.map((n) => {
          const fresh = createChannelNode(n.type, vertical, n.position, n.id);
          // Preserve identity, label, fixed inputs and actuals; reseed assumptions.
          return {
            ...n,
            assumptions: fresh.assumptions,
          };
        }),
      },
    }));
    get().recompute();
  },

  resetProject: () => {
    const project = createDefaultProject();
    set({ project, selectedNodeId: null });
    get().recompute();
  },

  importProject: (project) => {
    // Replace the whole project (e.g. from an imported JSON file) and recompute.
    set({ project: { ...project, updatedAt: nowIso() }, selectedNodeId: null });
    get().recompute();
  },
}));

// Persist project inputs (debounced) whenever they change. Results are derived
// and intentionally not saved.
let lastProject = useStore.getState().project;
useStore.subscribe((state) => {
  if (state.project !== lastProject) {
    lastProject = state.project;
    saveProjectDebounced(state.project);
  }
});
