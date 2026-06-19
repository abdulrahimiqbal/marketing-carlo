import { useState } from 'react';

/**
 * Campaign Canvas is a node canvas built for desktop. On phones the three-pane
 * layout is cramped, so we show a dismissible heads-up rather than break.
 */
export function SmallScreenNotice() {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-4 bg-slate-900/95 p-6 text-center text-white md:hidden">
      <h2 className="text-lg font-semibold">Best on a larger screen</h2>
      <p className="max-w-xs text-sm text-slate-300">
        Campaign Canvas is a drag-and-drop node canvas designed for desktop. You can continue, but
        it will be cramped here.
      </p>
      <button
        onClick={() => setDismissed(true)}
        className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-slate-900"
      >
        Continue anyway
      </button>
    </div>
  );
}
