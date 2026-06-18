// Canvas empty state (§7.1) — now showcases the grouped channel library.
import { useStore } from '../state/store';
import { ChannelIcon } from './ChannelIcon';
import { CHANNEL_GROUPS, CHANNEL_SHORT_LABELS, CHANNEL_LABELS } from '../benchmarks/presets';

export function EmptyState() {
  const addNode = useStore((s) => s.addNode);

  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6">
      <div className="pointer-events-auto w-full max-w-lg rounded-2xl border border-slate-200 bg-white/95 p-6 text-center shadow-sm backdrop-blur">
        <h2 className="text-lg font-semibold text-slate-900">
          Add your first channel to see the users before you spend
        </h2>
        <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500">
          Pick any channel below. We&rsquo;ll run 2,000 Monte Carlo simulations and show an honest
          range of paying users — per channel and for the whole campaign.
        </p>

        <div className="mt-5 space-y-3 text-left">
          {CHANNEL_GROUPS.map((g) => (
            <div key={g.group}>
              <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                {g.label}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {g.types.map((type) => (
                  <button
                    key={type}
                    onClick={() => addNode(type)}
                    title={`Add ${CHANNEL_LABELS[type]}`}
                    className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:border-indigo-300 hover:bg-indigo-50"
                  >
                    <ChannelIcon type={type} size={18} />
                    {CHANNEL_SHORT_LABELS[type]}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
