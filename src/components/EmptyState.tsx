// Canvas empty state (§7.1).
import { useStore } from '../state/store';
import { ChannelIcon } from './ChannelIcon';
import { CHANNEL_TYPES, CHANNEL_LABELS } from '../benchmarks/presets';

export function EmptyState() {
  const addNode = useStore((s) => s.addNode);

  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6">
      <div className="pointer-events-auto max-w-md rounded-2xl border border-slate-200 bg-white/90 p-8 text-center shadow-sm backdrop-blur">
        <h2 className="text-lg font-semibold text-slate-900">
          Add your first channel to see the users before you spend
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          Map each channel as a node. We&rsquo;ll show an honest range of paying users —
          per channel and for the whole campaign.
        </p>
        <div className="mt-6 flex flex-col gap-2">
          {CHANNEL_TYPES.map((type) => (
            <button
              key={type}
              onClick={() => addNode(type)}
              className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-left text-sm font-medium text-slate-700 transition-colors hover:border-indigo-300 hover:bg-indigo-50"
            >
              <ChannelIcon type={type} />
              <span>Add {CHANNEL_LABELS[type]}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
