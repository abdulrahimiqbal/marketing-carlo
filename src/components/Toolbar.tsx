// Toolbar (§7.3 / §12): project name, vertical selector, add-channel buttons.
// Changing the vertical prompts before touching existing nodes (§14).
import { useState } from 'react';
import { useStore } from '../state/store';
import type { Vertical } from '../engine/types';
import {
  CHANNEL_TYPES,
  CHANNEL_LABELS,
  VERTICAL_LABELS,
} from '../benchmarks/presets';
import { ChannelIcon } from './ChannelIcon';
import { ConfirmDialog } from './ConfirmDialog';

const VERTICALS: Vertical[] = ['b2b_saas', 'consumer_app', 'ecommerce'];

export function Toolbar() {
  const name = useStore((s) => s.project.name);
  const vertical = useStore((s) => s.project.vertical);
  const nodeCount = useStore((s) => s.project.nodes.length);
  const setProjectName = useStore((s) => s.setProjectName);
  const setVertical = useStore((s) => s.setVertical);
  const reseedAllNodes = useStore((s) => s.reseedAllNodes);
  const addNode = useStore((s) => s.addNode);

  const [pendingVertical, setPendingVertical] = useState<Vertical | null>(null);

  const handleVerticalChange = (v: Vertical) => {
    if (v === vertical) return;
    // Never silently rewrite existing edited assumptions — prompt first (§14).
    if (nodeCount > 0) setPendingVertical(v);
    else setVertical(v);
  };

  return (
    <div className="border-b border-slate-200 px-4 py-4">
      {/* Brand */}
      <div className="mb-3">
        <div className="flex items-center gap-2">
          <img src="/favicon.svg" alt="" className="h-6 w-6" />
          <span className="text-sm font-bold tracking-tight text-slate-900">Campaign Canvas</span>
        </div>
        <p className="mt-1 text-[11px] leading-snug text-slate-400">
          See the users before you spend.
        </p>
      </div>

      {/* Project name */}
      <label className="block text-[11px] font-medium text-slate-500">Project</label>
      <input
        value={name}
        onChange={(e) => setProjectName(e.target.value)}
        spellCheck={false}
        className="mt-1 w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-sm font-medium text-slate-800 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200"
      />

      {/* Vertical selector */}
      <label className="mt-3 block text-[11px] font-medium text-slate-500">Vertical</label>
      <select
        value={vertical}
        onChange={(e) => handleVerticalChange(e.target.value as Vertical)}
        className="mt-1 w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-800 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200"
      >
        {VERTICALS.map((v) => (
          <option key={v} value={v}>
            {VERTICAL_LABELS[v]}
          </option>
        ))}
      </select>
      <p className="mt-1 text-[10px] text-slate-400">Seeds benchmarks for new channels.</p>

      {/* Add channels */}
      <label className="mt-3 block text-[11px] font-medium text-slate-500">Add channel</label>
      <div className="mt-1 grid grid-cols-3 gap-1.5">
        {CHANNEL_TYPES.map((type) => (
          <button
            key={type}
            onClick={() => addNode(type)}
            title={`Add ${CHANNEL_LABELS[type]}`}
            className="flex flex-col items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-2 text-[10px] font-medium text-slate-600 transition-colors hover:border-indigo-300 hover:bg-indigo-50"
          >
            <ChannelIcon type={type} size={20} />
            <span className="leading-tight">{CHANNEL_LABELS[type].split(' ')[0]}</span>
          </button>
        ))}
      </div>

      <ConfirmDialog
        open={pendingVertical !== null}
        title="Change vertical"
        onClose={() => setPendingVertical(null)}
        actions={[
          {
            label: 'Only new channels',
            tone: 'primary',
            onClick: () => {
              if (pendingVertical) setVertical(pendingVertical);
              setPendingVertical(null);
            },
          },
          {
            label: `Reseed all ${nodeCount}`,
            tone: 'default',
            onClick: () => {
              if (pendingVertical) reseedAllNodes(pendingVertical);
              setPendingVertical(null);
            },
          },
        ]}
      >
        Switch to{' '}
        <strong>{pendingVertical ? VERTICAL_LABELS[pendingVertical] : ''}</strong> benchmarks?
        New channels will use them. Your {nodeCount} existing{' '}
        {nodeCount === 1 ? 'channel keeps its' : 'channels keep their'} current assumptions unless
        you reseed — which overwrites any edits you&rsquo;ve made.
      </ConfirmDialog>
    </div>
  );
}
