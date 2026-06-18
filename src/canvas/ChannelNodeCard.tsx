// Custom React Flow node (§7.1). Compact: icon + editable label, the headline
// P50 paying users with its range, a range bar, the confidence badge, and a
// spend / organic tag. A result is never shown without its range and badge.
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { useStore } from '../state/store';
import { ConfidenceBadge } from '../components/ConfidenceBadge';
import { RangeBar } from '../components/RangeBar';
import { ChannelIcon } from '../components/ChannelIcon';
import { formatCount, formatMoney } from '../lib/format';
import { CHANNEL_META } from '../engine/funnel';

export function ChannelNodeCard({ id }: NodeProps) {
  const node = useStore((s) => s.project.nodes.find((n) => n.id === id));
  const results = useStore((s) => s.nodeResults[id]);
  const selected = useStore((s) => s.selectedNodeId === id);
  const updateNodeLabel = useStore((s) => s.updateNodeLabel);

  if (!node || !results) return null;

  const paid = CHANNEL_META[node.type].paid;
  const paying = results.payingUsers;
  const actualPaying = node.actuals?.payingUsers;

  return (
    <div
      className={`w-64 rounded-xl bg-white shadow-sm transition-shadow ${
        selected ? 'ring-2 ring-indigo-500 shadow-md' : 'ring-1 ring-slate-200 hover:shadow-md'
      }`}
    >
      <Handle type="target" position={Position.Left} className="!h-2 !w-2 !bg-slate-300" />

      {/* Header */}
      <div className="flex items-center gap-2 px-3 pt-3">
        <ChannelIcon type={node.type} />
        <input
          className="nodrag min-w-0 flex-1 rounded border border-transparent bg-transparent px-1 py-0.5 text-sm font-semibold text-slate-800 outline-none hover:border-slate-200 focus:border-indigo-300 focus:bg-slate-50"
          value={node.label}
          spellCheck={false}
          onChange={(e) => updateNodeLabel(id, e.target.value)}
          onMouseDown={(e) => e.stopPropagation()}
        />
        {paid ? (
          <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
            {formatMoney(results.totalSpend)}
          </span>
        ) : (
          <span className="shrink-0 rounded-full bg-organic-50 px-2 py-0.5 text-[11px] font-medium text-organic-700 ring-1 ring-inset ring-organic-200">
            organic
          </span>
        )}
      </div>

      {/* Headline result */}
      <div className="px-3 pt-2">
        <div className="text-2xl font-bold leading-tight text-slate-900">
          ~{formatCount(paying.p50)}
          <span className="ml-1 text-sm font-medium text-slate-500">paying users</span>
        </div>
        <div className="mt-0.5 text-xs text-slate-500">
          range {formatCount(paying.p10)}–{formatCount(paying.p90)}{' '}
          <span className="text-slate-400">(pessimistic–optimistic)</span>
        </div>
        {actualPaying !== undefined && (
          <div className="mt-1 text-xs font-medium text-slate-600">
            Actual {formatCount(actualPaying)}
            <span
              className={`ml-1 ${
                actualPaying >= paying.p50 ? 'text-green-600' : 'text-amber-600'
              }`}
            >
              ({actualPaying >= paying.p50 ? '+' : ''}
              {formatCount(actualPaying - paying.p50)} vs est.)
            </span>
          </div>
        )}
      </div>

      {/* Range bar */}
      <div className="px-3 pt-1">
        <RangeBar range={paying} tone={paid ? 'paid' : 'organic'} />
      </div>

      {/* Badge */}
      <div className="flex items-center px-3 pb-3 pt-1">
        <ConfidenceBadge confidence={results.confidence} />
      </div>

      <Handle type="source" position={Position.Right} className="!h-2 !w-2 !bg-slate-300" />
    </div>
  );
}
