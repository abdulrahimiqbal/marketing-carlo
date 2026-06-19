import { Tooltip } from './Tooltip';

/** Small "?" affordance that reveals explanatory copy on hover/focus. */
export function InfoDot({ text, widthClass = 'w-52' }: { text: string; widthClass?: string }) {
  return (
    <Tooltip content={text} widthClass={widthClass}>
      <span className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-slate-200 text-[9px] font-bold text-slate-500">
        ?
      </span>
    </Tooltip>
  );
}
