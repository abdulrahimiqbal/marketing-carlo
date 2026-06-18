import type { ChannelType } from '../engine/types';

interface ChannelIconProps {
  type: ChannelType;
  size?: number;
}

const STYLES: Record<ChannelType, { bg: string; fg: string; glyph: string; ring?: string }> = {
  meta_ads: { bg: 'linear-gradient(135deg,#0064e0,#0c8bff)', fg: '#fff', glyph: '∞' },
  google_search: { bg: '#ffffff', fg: '#4285F4', glyph: 'G', ring: '#e2e8f0' },
  x_organic: { bg: '#000000', fg: '#fff', glyph: '𝕏' },
};

/** Small brand-ish monogram badge — dependency-free. */
export function ChannelIcon({ type, size = 22 }: ChannelIconProps) {
  const s = STYLES[type];
  return (
    <span
      aria-hidden
      style={{
        width: size,
        height: size,
        background: s.bg,
        color: s.fg,
        boxShadow: s.ring ? `inset 0 0 0 1px ${s.ring}` : undefined,
        fontSize: size * 0.6,
      }}
      className="inline-flex shrink-0 items-center justify-center rounded-md font-bold leading-none"
    >
      {s.glyph}
    </span>
  );
}
