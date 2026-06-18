import type { ReactNode } from 'react';

interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  /** Tailwind width class for the bubble. */
  widthClass?: string;
}

/**
 * Lightweight hover/focus tooltip. Used to surface the §8 confidence copy. The
 * trigger is keyboard-focusable so the copy is reachable without a mouse.
 */
export function Tooltip({ content, children, widthClass = 'w-64' }: TooltipProps) {
  return (
    <span className="group relative inline-flex">
      <span tabIndex={0} className="inline-flex cursor-help outline-none">
        {children}
      </span>
      <span
        role="tooltip"
        className={`pointer-events-none absolute left-1/2 top-full z-50 mt-2 ${widthClass} -translate-x-1/2 rounded-lg bg-slate-900 px-3 py-2 text-xs font-normal leading-snug text-slate-100 opacity-0 shadow-xl ring-1 ring-black/10 transition-opacity duration-100 group-hover:opacity-100 group-focus-within:opacity-100`}
      >
        {content}
      </span>
    </span>
  );
}
