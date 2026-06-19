// The real shape of the Monte Carlo output for paying users. Bars inside the
// P10–P90 band are solid; the tails are faded; the bin containing P50 is darkest.
// This is the actual sampled distribution — not decoration.
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import type { NodeDetail } from '../engine/types';
import { formatCount } from '../lib/format';

interface Props {
  detail: NodeDetail;
  tone?: 'paid' | 'organic';
}

interface TipPayload {
  payload: { x0: number; x1: number; count: number };
}

function BinTooltip({ active, payload, draws }: { active?: boolean; payload?: TipPayload[]; draws: number }) {
  if (!active || !payload?.length) return null;
  const b = payload[0].payload;
  const pct = ((b.count / draws) * 100).toFixed(1);
  return (
    <div className="rounded-md bg-slate-900 px-2 py-1 text-[11px] text-white shadow-lg">
      {formatCount(b.x0)}–{formatCount(b.x1)} paying · {b.count} draws ({pct}%)
    </div>
  );
}

export function DistributionChart({ detail, tone = 'paid' }: Props) {
  const { histogram, range, draws } = detail;
  const solid = tone === 'organic' ? '#f59e0b' : '#3b82f6';
  const faded = tone === 'organic' ? '#fde68a' : '#bfdbfe';
  const median = tone === 'organic' ? '#b45309' : '#1d4ed8';

  const data = histogram.map((b) => ({ ...b, mid: (b.x0 + b.x1) / 2 }));

  const colorFor = (b: { x0: number; x1: number }) => {
    if (range.p50 >= b.x0 && range.p50 < b.x1) return median;
    const inBand = b.x1 > range.p10 && b.x0 < range.p90;
    return inBand ? solid : faded;
  };

  return (
    <div>
      <div style={{ height: 110 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 6, right: 2, bottom: 0, left: 2 }} barCategoryGap={1}>
            <Tooltip
              cursor={{ fill: 'rgba(0,0,0,0.04)' }}
              content={<BinTooltip draws={draws} />}
              isAnimationActive={false}
            />
            <Bar dataKey="count" isAnimationActive={false} radius={[2, 2, 0, 0]}>
              {data.map((b, i) => (
                <Cell key={i} fill={colorFor(b)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      {/* honest axis: most-likely in the middle, the 80% interval at the ends */}
      <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400">
        <span>{formatCount(range.p10)} (P10)</span>
        <span className="font-semibold text-slate-600">{formatCount(range.p50)} most likely</span>
        <span>{formatCount(range.p90)} (P90)</span>
      </div>
    </div>
  );
}
