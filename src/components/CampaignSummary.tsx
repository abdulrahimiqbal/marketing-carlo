// Campaign summary (§7.3). Always shows paid and organic subtotals separately —
// the split is never merged into one number. That seam is the product's core
// honesty feature.
import { useStore } from '../state/store';
import type { CampaignTotals } from '../engine/types';
import { RangeReadout } from './RangeReadout';
import { formatMoney, formatRangeProse } from '../lib/format';

function SplitRow({
  title,
  tone,
  totals,
}: {
  title: string;
  tone: 'paid' | 'organic';
  totals: CampaignTotals;
}) {
  const accent = tone === 'organic' ? 'text-organic-700' : 'text-paid-700';
  const dot = tone === 'organic' ? 'bg-organic-500' : 'bg-paid-500';
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-3">
      <div className="mb-1.5 flex items-center justify-between">
        <span className={`flex items-center gap-1.5 text-xs font-semibold ${accent}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
          {title}
          <span className="font-normal text-slate-400">
            · {totals.nodeCount} {totals.nodeCount === 1 ? 'channel' : 'channels'}
          </span>
        </span>
        <span className="text-xs text-slate-500">{formatMoney(totals.totalSpend)} spend</span>
      </div>
      <RangeReadout label="Paying users" range={totals.payingUsers} tone={tone} />
      <div className="mt-1 text-[11px] text-slate-500">
        {totals.costPerPayingUser
          ? `cost / paying ${formatRangeProse(totals.costPerPayingUser, 'money')}`
          : 'no paid spend'}
      </div>
    </div>
  );
}

export function CampaignSummary() {
  const summary = useStore((s) => s.summary);
  const nodeCount = useStore((s) => s.project.nodes.length);
  const { total, paid, organic } = summary;

  if (nodeCount === 0) {
    return (
      <div className="px-4 py-5">
        <h2 className="text-sm font-semibold text-slate-700">Campaign totals</h2>
        <p className="mt-2 text-xs text-slate-400">
          Add channels to see honest totals — with paid and organic kept separate.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 px-4 py-5">
      <div>
        <h2 className="text-sm font-semibold text-slate-700">Campaign totals</h2>
        <p className="text-[11px] text-slate-400">Summed per draw, then ranged — not naive-added.</p>
      </div>

      {/* Headline total */}
      <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <RangeReadout
          label="Total paying users"
          range={total.payingUsers}
          tone="paid"
          bar
          emphasize
        />
        <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2 text-xs text-slate-600">
          <span>{formatMoney(total.totalSpend)} total spend</span>
          <span>
            {total.costPerPayingUser
              ? `blended ${formatRangeProse(total.costPerPayingUser, 'money')}/paying`
              : '—'}
          </span>
        </div>
      </div>

      {/* The seam — paid vs organic, never blended */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="h-px flex-1 bg-slate-200" />
          <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            paid vs organic
          </span>
          <div className="h-px flex-1 bg-slate-200" />
        </div>
        <SplitRow title="Paid" tone="paid" totals={paid} />
        <SplitRow title="Organic" tone="organic" totals={organic} />
        <p className="px-1 text-[10px] leading-snug text-slate-400">
          We keep these separate on purpose. Blending a tight paid estimate with a wide organic
          guess would hide the uncertainty.
        </p>
      </div>

      {/* Secondary metrics */}
      <div className="space-y-2 rounded-lg border border-slate-100 p-3">
        <RangeReadout label="Total visitors" range={total.visitors} tone="paid" />
        <RangeReadout label="Total signups" range={total.signups} tone="paid" />
      </div>
    </div>
  );
}
