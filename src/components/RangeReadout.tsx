// Reusable range readout honoring §9: P50 is primary and always shown with its
// P10–P90 range and plain-language labels (pessimistic / most likely / optimistic).
import type { Range } from '../engine/types';
import { formatValue, type ValueKind } from '../lib/format';
import { RangeBar } from './RangeBar';

interface RangeReadoutProps {
  label: string;
  range: Range;
  kind?: ValueKind;
  tone?: 'paid' | 'organic';
  bar?: boolean;
  domainMax?: number;
  emphasize?: boolean;
}

export function RangeReadout({
  label,
  range,
  kind = 'count',
  tone = 'paid',
  bar = false,
  domainMax,
  emphasize = false,
}: RangeReadoutProps) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs font-medium text-slate-500">{label}</span>
        <span className="whitespace-nowrap">
          <span
            className={`font-semibold text-slate-900 ${emphasize ? 'text-lg' : 'text-sm'}`}
          >
            {formatValue(range.p50, kind)}
          </span>
          <span className="ml-1 text-[11px] text-slate-400">most likely</span>
        </span>
      </div>
      <div className="mt-0.5 flex items-center justify-between text-[11px] text-slate-500">
        <span>
          {formatValue(range.p10, kind)} <span className="text-slate-400">pessimistic</span>
        </span>
        <span>
          <span className="text-slate-400">optimistic</span> {formatValue(range.p90, kind)}
        </span>
      </div>
      {bar && (
        <div className="mt-1">
          <RangeBar range={range} tone={tone} domainMax={domainMax} />
        </div>
      )}
    </div>
  );
}
