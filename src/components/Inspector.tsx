// Node inspector (§7.2). Fixed inputs, editable triangular assumptions, full
// results, the organic high-variance explainer, and manual actuals (§10).
import { useMemo, useState } from 'react';
import { useStore } from '../state/store';
import { CHANNEL_META, isPaid } from '../engine/funnel';
import { simulateNodeDetail } from '../engine/simulate';
import type { ChannelNode, Uncertain, Vertical } from '../engine/types';
import {
  ASSUMPTION_META,
  CHANNEL_FORMULAS,
  ECOMMERCE_STAGE_OVERRIDES,
  FIXED_INPUT_META,
} from '../benchmarks/presets';
import { ChannelIcon } from './ChannelIcon';
import { ConfidenceBadge } from './ConfidenceBadge';
import { RangeReadout } from './RangeReadout';
import { NumberField } from './NumberField';
import { InfoDot } from './InfoDot';
import { MessageCheck } from './MessageCheck';
import { DistributionChart } from './DistributionChart';
import { SensitivityChart } from './SensitivityChart';
import { formatCount, type ValueKind } from '../lib/format';

type Unit = 'currency' | 'percent' | 'number';

function unitToKind(unit: Unit): Exclude<ValueKind, 'count'> {
  return unit === 'currency' ? 'money' : unit;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
      {children}
    </h3>
  );
}

function AssumptionRow({
  nodeId,
  fieldKey,
  uncertain,
  label,
  help,
  unit,
}: {
  nodeId: string;
  fieldKey: string;
  uncertain: Uncertain;
  label: string;
  help?: string;
  unit: Unit;
}) {
  const [expanded, setExpanded] = useState(false);
  const setAssumptionField = useStore((s) => s.setAssumptionField);
  const resetAssumption = useStore((s) => s.resetAssumptionToBenchmark);

  const kind = unitToKind(unit);
  const isPct = kind === 'percent';
  const toDisplay = (v: number) => (isPct ? v * 100 : v);
  const fromDisplay = (v: number) => (isPct ? v / 100 : v);
  const prefix = kind === 'money' ? '$' : undefined;
  const suffix = isPct ? '%' : undefined;
  const step = isPct ? 0.1 : kind === 'money' ? 0.5 : 1;

  const commit = (field: keyof Uncertain) => (v: number) =>
    setAssumptionField(nodeId, fieldKey, field, fromDisplay(v));

  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50/40 px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1 text-xs font-medium text-slate-700">
            <span className="truncate">{label}</span>
            {help && <InfoDot text={help} />}
          </div>
          <button
            onClick={() => setExpanded((e) => !e)}
            className="text-[11px] text-indigo-600 hover:underline"
          >
            {expanded ? 'Hide range' : 'Edit low / high'}
          </button>
        </div>
        <div className="w-24 shrink-0">
          <NumberField
            value={toDisplay(uncertain.expected)}
            onCommit={commit('expected')}
            prefix={prefix}
            suffix={suffix}
            step={step}
            ariaLabel={`${label} most likely`}
          />
        </div>
      </div>

      {expanded && (
        <div className="mt-2 space-y-2 border-t border-slate-100 pt-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] text-slate-500">Low (pessimistic)</label>
              <NumberField
                value={toDisplay(uncertain.low)}
                onCommit={commit('low')}
                prefix={prefix}
                suffix={suffix}
                step={step}
                ariaLabel={`${label} low`}
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-500">High (optimistic)</label>
              <NumberField
                value={toDisplay(uncertain.high)}
                onCommit={commit('high')}
                prefix={prefix}
                suffix={suffix}
                step={step}
                ariaLabel={`${label} high`}
              />
            </div>
          </div>
          <button
            onClick={() => resetAssumption(nodeId, fieldKey)}
            className="text-[11px] text-slate-500 hover:text-indigo-600 hover:underline"
          >
            ↺ Reset to benchmark
          </button>
        </div>
      )}
    </div>
  );
}

function ActualsRow({
  node,
  metric,
  label,
  estP50,
}: {
  node: ChannelNode;
  metric: 'visitors' | 'signups' | 'payingUsers';
  label: string;
  estP50: number;
}) {
  const setActual = useStore((s) => s.setActual);
  const actual = node.actuals?.[metric];
  const delta = actual !== undefined ? actual - estP50 : undefined;

  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs text-slate-600">{label}</span>
      <div className="flex items-center gap-2">
        {delta !== undefined && (
          <span className="text-[11px] text-slate-400">
            est {formatCount(estP50)} ·{' '}
            <span className={delta >= 0 ? 'text-green-600' : 'text-amber-600'}>
              {delta >= 0 ? '+' : ''}
              {formatCount(delta)}
            </span>
          </span>
        )}
        <input
          type="number"
          min={0}
          placeholder="—"
          aria-label={`Actual ${label}`}
          value={actual ?? ''}
          onChange={(e) => {
            const v = e.target.value;
            setActual(node.id, metric, v === '' ? undefined : parseFloat(v));
          }}
          className="w-20 rounded-md border border-slate-200 bg-white px-2 py-1 text-sm text-slate-800 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200"
        />
      </div>
    </div>
  );
}

export function Inspector({ node, vertical }: { node: ChannelNode; vertical: Vertical }) {
  const results = useStore((s) => s.nodeResults[node.id]);
  const updateNodeLabel = useStore((s) => s.updateNodeLabel);
  const removeNode = useStore((s) => s.removeNode);
  const selectNode = useStore((s) => s.selectNode);

  // Rich detail (distribution + sensitivity) — recompute only when the numbers
  // change, not when the node is moved or renamed.
  const detail = useMemo(
    () => simulateNodeDetail(node),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [node.id, node.type, JSON.stringify(node.fixedInputs), JSON.stringify(node.assumptions)],
  );

  if (!results) return null;

  const meta = CHANNEL_META[node.type];
  const paid = isPaid(node.type);
  const isEcom = vertical === 'ecommerce';
  const tone = paid ? 'paid' : 'organic';

  const signupsLabel = isEcom ? 'Add-to-cart' : 'Signups';
  const payingLabel = isEcom ? 'Purchases' : 'Paying users';
  const costLabel = isEcom ? 'Cost per purchase' : 'Cost per paying user';

  const labelOf = (key: string): string => {
    if (isEcom && ECOMMERCE_STAGE_OVERRIDES[key]) return ECOMMERCE_STAGE_OVERRIDES[key].label;
    return ASSUMPTION_META[key]?.label ?? key;
  };

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-slate-200 bg-white px-4 py-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <ChannelIcon type={node.type} size={26} />
            <input
              className="min-w-0 flex-1 rounded border border-transparent bg-transparent px-1 py-0.5 text-base font-semibold text-slate-900 outline-none hover:border-slate-200 focus:border-indigo-300 focus:bg-slate-50"
              value={node.label}
              spellCheck={false}
              onChange={(e) => updateNodeLabel(node.id, e.target.value)}
            />
          </div>
          <button
            onClick={() => selectNode(null)}
            className="shrink-0 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close inspector"
            title="Close"
          >
            ✕
          </button>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <ConfidenceBadge confidence={results.confidence} />
        </div>
        <p className="mt-1.5 font-mono text-[10px] leading-snug text-slate-400">
          {CHANNEL_FORMULAS[node.type]}
        </p>
      </div>

      <div className="space-y-6 px-4 py-4">
        {/* Organic explainer (§7.2 / §8) */}
        {!paid && (
          <div className="rounded-lg border border-organic-200 bg-organic-50 px-3 py-2.5 text-xs leading-relaxed text-organic-700">
            Organic reach is a power-law lottery — one large reshare can swing this 10×. The range
            is wide on purpose. v1 estimates this; it does not yet simulate audience behavior.
          </div>
        )}

        {/* Fixed inputs */}
        <section>
          <SectionTitle>Inputs you set</SectionTitle>
          <div className="space-y-2">
            {meta.fixedInputs.map((key) => {
              const m = FIXED_INPUT_META[key];
              return (
                <div key={key} className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-slate-700">{m.label}</span>
                  <div className="w-28">
                    <FixedInputField nodeId={node.id} fieldKey={key} unit={m.unit} value={node.fixedInputs[key] ?? 0} />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Assumptions */}
        <section>
          <SectionTitle>Assumptions</SectionTitle>
          <p className="mb-2 text-[11px] text-slate-400">
            Starting estimates — adjust to your reality. Each is a most-likely value with a low /
            high range.
          </p>
          <div className="space-y-2">
            {meta.assumptionKeys.map((key) => {
              const u = node.assumptions[key];
              if (!u) return null;
              const am = ASSUMPTION_META[key];
              const override = isEcom ? ECOMMERCE_STAGE_OVERRIDES[key] : undefined;
              return (
                <AssumptionRow
                  key={key}
                  nodeId={node.id}
                  fieldKey={key}
                  uncertain={u}
                  label={override?.label ?? am.label}
                  help={override?.help ?? am.help}
                  unit={am.unit}
                />
              );
            })}
          </div>
        </section>

        {/* Full results */}
        <section>
          <SectionTitle>Results (P10 · P50 · P90)</SectionTitle>
          <div className="space-y-3 rounded-lg border border-slate-100 p-3">
            <RangeReadout label="Visitors" range={results.visitors} kind="count" tone={tone} />
            <RangeReadout label={signupsLabel} range={results.signups} kind="count" tone={tone} />
            <RangeReadout
              label={payingLabel}
              range={results.payingUsers}
              kind="count"
              tone={tone}
              bar
              emphasize
            />
            {results.costPerPayingUser ? (
              <RangeReadout
                label={costLabel}
                range={results.costPerPayingUser}
                kind="money"
                tone={tone}
              />
            ) : (
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>{costLabel}</span>
                <span>— (organic, no spend)</span>
              </div>
            )}
          </div>
        </section>

        {/* Distribution — the real Monte Carlo output shape */}
        <section>
          <div className="mb-2 flex items-center justify-between">
            <SectionTitle>Distribution · {formatCount(detail.draws)} simulations</SectionTitle>
            <span className="text-[10px] text-slate-400">
              spread {Math.round(detail.relativeSpread * 100)}% of P50
            </span>
          </div>
          <div className="rounded-lg border border-slate-100 p-3">
            <DistributionChart detail={detail} tone={tone} />
          </div>
        </section>

        {/* Sensitivity — what drives the uncertainty */}
        <section>
          <SectionTitle>What drives the uncertainty</SectionTitle>
          <div className="rounded-lg border border-slate-100 p-3">
            <SensitivityChart sensitivity={detail.sensitivity} labelOf={labelOf} tone={tone} />
          </div>
        </section>

        {/* Actuals (§10) */}
        <section>
          <SectionTitle>Actuals (after launch)</SectionTitle>
          <p className="mb-2 text-[11px] text-slate-400">
            Enter what really happened. We show the honest side-by-side — no auto re-estimation in
            v1.
          </p>
          <div className="space-y-2 rounded-lg border border-slate-100 p-3">
            <ActualsRow node={node} metric="visitors" label="Visitors" estP50={results.visitors.p50} />
            <ActualsRow node={node} metric="signups" label={signupsLabel} estP50={results.signups.p50} />
            <ActualsRow
              node={node}
              metric="payingUsers"
              label={payingLabel}
              estP50={results.payingUsers.p50}
            />
          </div>
        </section>

        {/* Optional qualitative message check (organic only, §11) */}
        {!paid && <MessageCheck channelLabel={node.label} />}

        {/* Danger zone */}
        <button
          onClick={() => removeNode(node.id)}
          className="w-full rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-100"
        >
          Delete channel
        </button>
      </div>
    </div>
  );
}

function FixedInputField({
  nodeId,
  fieldKey,
  unit,
  value,
}: {
  nodeId: string;
  fieldKey: string;
  unit: 'currency' | 'number';
  value: number;
}) {
  const setFixedInput = useStore((s) => s.setFixedInput);
  return (
    <NumberField
      value={value}
      onCommit={(v) => setFixedInput(nodeId, fieldKey, v)}
      prefix={unit === 'currency' ? '$' : undefined}
      step={unit === 'currency' ? 100 : 1}
      ariaLabel={fieldKey}
    />
  );
}
