import { useEffect, useState } from 'react';

interface NumberFieldProps {
  value: number;
  onCommit: (value: number) => void;
  step?: number;
  min?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  ariaLabel?: string;
}

/**
 * Controlled number input that tolerates mid-typing states (empty, "1.", etc.)
 * by holding local text and only committing a parsed, finite number.
 */
export function NumberField({
  value,
  onCommit,
  step = 1,
  min = 0,
  prefix,
  suffix,
  className = '',
  ariaLabel,
}: NumberFieldProps) {
  const [text, setText] = useState(String(value));

  // Keep in sync when the value changes externally (e.g. reset to benchmark).
  useEffect(() => {
    setText((prev) => (parseFloat(prev) === value ? prev : String(value)));
  }, [value]);

  const handleChange = (raw: string) => {
    setText(raw);
    const n = parseFloat(raw);
    if (Number.isFinite(n)) onCommit(n);
  };

  const handleBlur = () => {
    // Snap an empty / invalid field back to the committed value.
    if (!Number.isFinite(parseFloat(text))) setText(String(value));
  };

  return (
    <div
      className={`flex items-center rounded-md border border-slate-200 bg-white px-2 focus-within:border-indigo-400 focus-within:ring-1 focus-within:ring-indigo-200 ${className}`}
    >
      {prefix && <span className="mr-1 text-xs text-slate-400">{prefix}</span>}
      <input
        type="number"
        inputMode="decimal"
        aria-label={ariaLabel}
        className="w-full bg-transparent py-1 text-sm text-slate-800 outline-none"
        value={text}
        step={step}
        min={min}
        onChange={(e) => handleChange(e.target.value)}
        onBlur={handleBlur}
      />
      {suffix && <span className="ml-1 text-xs text-slate-400">{suffix}</span>}
    </div>
  );
}
