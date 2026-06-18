// A small, always-true status of what the engine is doing: 2,000 Monte Carlo
// draws per channel, re-run on every edit. The pulse marks each REAL recompute —
// no fake latency, just making the (genuinely fast) re-simulation perceptible.
import { useEffect, useRef, useState } from 'react';
import { useStore } from '../state/store';
import { N_DRAWS } from '../engine/simulate';
import { formatCount } from '../lib/format';

export function SimulationStatus() {
  const simSeq = useStore((s) => s.simSeq);
  const nodeCount = useStore((s) => s.project.nodes.length);
  const [pulsing, setPulsing] = useState(false);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setPulsing(true);
    const t = setTimeout(() => setPulsing(false), 600);
    return () => clearTimeout(t);
  }, [simSeq]);

  const totalDraws = nodeCount * N_DRAWS;

  return (
    <div className="mt-2 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5">
      <span className="relative flex h-2 w-2">
        {pulsing && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-75" />
        )}
        <span
          className={`relative inline-flex h-2 w-2 rounded-full ${
            pulsing ? 'bg-indigo-500' : 'bg-green-500'
          }`}
        />
      </span>
      <span className="text-[11px] font-medium text-slate-600">
        {pulsing ? 'Re-simulating…' : 'Monte Carlo engine'}
      </span>
      <span className="ml-auto text-[10px] tabular-nums text-slate-400">
        {nodeCount > 0
          ? `${formatCount(N_DRAWS)} draws × ${nodeCount} = ${formatCount(totalDraws)}`
          : `${formatCount(N_DRAWS)} draws / channel`}
      </span>
    </div>
  );
}
