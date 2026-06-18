// Confidence badges — the core honesty feature (§8). Badge text describes what
// the engine actually did. Never display a result without its badge.
import type { Confidence } from '../engine/types';
import { Tooltip } from './Tooltip';

interface BadgeCopy {
  text: string;
  tooltip: string;
  tone: 'paid' | 'organic' | 'neutral';
}

export const BADGE_COPY: Record<Confidence, BadgeCopy> = {
  estimated: {
    text: 'Estimated · assumption-based',
    tooltip:
      "A deterministic funnel over your assumptions. We are not integrated with the ad platform's auction, so this is an estimate, not a measurement. Adjust the assumptions to match your reality.",
    tone: 'paid',
  },
  estimated_high_variance: {
    text: 'Estimated · high variance',
    tooltip:
      'Organic reach is a power-law lottery — one large reshare can swing this 10×. The range here is wide on purpose. v1 estimates this; it does not yet simulate audience behavior.',
    tone: 'organic',
  },
  // Reserved for the v2 behavioral engine — not emitted in v1.
  simulated_behavioral: {
    text: 'Simulated · behavioral',
    tooltip: 'Reserved for the v2 behavioral agent engine.',
    tone: 'neutral',
  },
};

const TONE_CLASSES: Record<BadgeCopy['tone'], string> = {
  paid: 'bg-paid-50 text-paid-700 ring-paid-200',
  organic: 'bg-organic-50 text-organic-700 ring-organic-200',
  neutral: 'bg-slate-100 text-slate-600 ring-slate-200',
};

interface ConfidenceBadgeProps {
  confidence: Confidence;
  withTooltip?: boolean;
  className?: string;
}

export function ConfidenceBadge({
  confidence,
  withTooltip = true,
  className = '',
}: ConfidenceBadgeProps) {
  const copy = BADGE_COPY[confidence];

  const badge = (
    <span
      title={copy.tooltip}
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${TONE_CLASSES[copy.tone]} ${className}`}
    >
      <span
        aria-hidden
        className={`h-1.5 w-1.5 rounded-full ${
          copy.tone === 'organic'
            ? 'bg-organic-500'
            : copy.tone === 'paid'
              ? 'bg-paid-500'
              : 'bg-slate-400'
        }`}
      />
      {copy.text}
    </span>
  );

  if (!withTooltip) return badge;

  return <Tooltip content={copy.tooltip}>{badge}</Tooltip>;
}
