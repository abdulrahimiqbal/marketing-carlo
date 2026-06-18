import { useEffect, type ReactNode } from 'react';

export interface DialogAction {
  label: string;
  onClick: () => void;
  tone?: 'primary' | 'default' | 'danger';
}

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  children: ReactNode;
  actions: DialogAction[];
  onClose: () => void;
}

const TONE: Record<NonNullable<DialogAction['tone']>, string> = {
  primary: 'bg-indigo-600 text-white hover:bg-indigo-700',
  default: 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
  danger: 'bg-red-600 text-white hover:bg-red-700',
};

export function ConfirmDialog({ open, title, children, actions, onClose }: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        <div className="mt-2 text-sm leading-relaxed text-slate-600">{children}</div>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          {actions.map((a) => (
            <button
              key={a.label}
              onClick={a.onClick}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${TONE[a.tone ?? 'default']}`}
            >
              {a.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
