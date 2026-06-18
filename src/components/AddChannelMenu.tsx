// Grouped channel picker (Paid / Organic / Email). Replaces the flat button grid
// now that the library spans 12 channels.
import { useEffect, useRef, useState } from 'react';
import { useStore } from '../state/store';
import { CHANNEL_GROUPS, CHANNEL_LABELS } from '../benchmarks/presets';
import { ChannelIcon } from './ChannelIcon';

export function AddChannelMenu() {
  const addNode = useStore((s) => s.addNode);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
      >
        <span className="text-base leading-none">+</span> Add channel
      </button>

      {open && (
        <div className="absolute left-0 right-0 z-30 mt-1 max-h-80 overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
          {CHANNEL_GROUPS.map((g) => (
            <div key={g.group} className="mb-1 last:mb-0">
              <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                {g.label}
              </div>
              {g.types.map((type) => (
                <button
                  key={type}
                  onClick={() => {
                    addNode(type);
                    setOpen(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-slate-700 hover:bg-indigo-50"
                >
                  <ChannelIcon type={type} size={18} />
                  <span className="truncate">{CHANNEL_LABELS[type]}</span>
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
