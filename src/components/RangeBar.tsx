// Horizontal range bar (Recharts) — shows the P10–P90 span with a P50 marker.
// This is the visual form of "a range, not a point."
import { Bar, BarChart, ReferenceLine, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import type { Range } from '../engine/types';

interface RangeBarProps {
  range: Range;
  /** Shared axis maximum so multiple bars are comparable. Defaults to ~P90. */
  domainMax?: number;
  tone?: 'paid' | 'organic';
  height?: number;
}

export function RangeBar({ range, domainMax, tone = 'paid', height = 26 }: RangeBarProps) {
  const p10 = Math.max(0, range.p10);
  const p90 = Math.max(p10, range.p90);
  const max = Math.max(domainMax ?? p90 * 1.18, 1e-6);

  const data = [{ name: 'r', base: p10, span: Math.max(p90 - p10, 0) }];
  const spanColor = tone === 'organic' ? '#f59e0b' : '#3b82f6';
  const medianColor = tone === 'organic' ? '#b45309' : '#1d4ed8';

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          layout="vertical"
          data={data}
          margin={{ top: 6, right: 6, bottom: 6, left: 6 }}
        >
          <XAxis type="number" domain={[0, max]} hide />
          <YAxis type="category" dataKey="name" hide />
          {/* transparent offset to P10, then the colored P10→P90 span */}
          <Bar dataKey="base" stackId="a" fill="transparent" isAnimationActive={false} />
          <Bar
            dataKey="span"
            stackId="a"
            fill={spanColor}
            radius={[5, 5, 5, 5]}
            barSize={9}
            isAnimationActive={false}
          />
          <ReferenceLine
            x={range.p50}
            stroke={medianColor}
            strokeWidth={2.5}
            ifOverflow="extendDomain"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
