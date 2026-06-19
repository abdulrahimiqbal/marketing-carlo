// Variance-based sensitivity: which assumption is responsible for most of the
// P10–P90 spread. Pinning the top one (nailing it down with data) shrinks your
// range the most — so it's where to focus research before spending.
import type { SensitivityEntry } from '../engine/types';

interface Props {
  sensitivity: SensitivityEntry[];
  labelOf: (key: string) => string;
  tone?: 'paid' | 'organic';
}

export function SensitivityChart({ sensitivity, labelOf, tone = 'paid' }: Props) {
  const ranked = sensitivity.filter((s) => s.contribution > 0.001);
  if (ranked.length === 0) {
    return <p className="text-xs text-slate-400">No uncertainty to attribute — every assumption is fixed.</p>;
  }
  const top = tone === 'organic' ? '#f59e0b' : '#6366f1';
  const rest = '#cbd5e1';

  return (
    <div className="space-y-1.5">
      {ranked.map((s, i) => (
        <div key={s.key} className="flex items-center gap-2">
          <span className="w-28 shrink-0 truncate text-[11px] text-slate-600" title={labelOf(s.key)}>
            {labelOf(s.key)}
          </span>
          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.max(2, s.contribution * 100)}%`,
                background: i === 0 ? top : rest,
              }}
            />
          </div>
          <span className="w-9 shrink-0 text-right text-[11px] tabular-nums text-slate-500">
            {Math.round(s.contribution * 100)}%
          </span>
        </div>
      ))}
      <p className="pt-1 text-[10px] leading-snug text-slate-400">
        Share of the P10–P90 spread each assumption drives. Nail down{' '}
        <span className="font-medium text-slate-500">{labelOf(ranked[0].key)}</span> first to tighten
        the range fastest.
      </p>
    </div>
  );
}
