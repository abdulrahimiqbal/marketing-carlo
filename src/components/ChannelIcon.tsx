import type { ChannelType } from '../engine/types';

interface ChannelIconProps {
  type: ChannelType;
  size?: number;
}

const STYLES: Record<ChannelType, { bg: string; fg: string; glyph: string; ring?: string }> = {
  meta_ads: { bg: 'linear-gradient(135deg,#0064e0,#0c8bff)', fg: '#fff', glyph: '∞' },
  tiktok_ads: { bg: '#000000', fg: '#fff', glyph: '♪' },
  linkedin_ads: { bg: '#0A66C2', fg: '#fff', glyph: 'in' },
  reddit_ads: { bg: '#FF4500', fg: '#fff', glyph: 'r' },
  google_search: { bg: '#ffffff', fg: '#4285F4', glyph: 'G', ring: '#e2e8f0' },
  bing_ads: { bg: '#0C8484', fg: '#fff', glyph: 'b' },
  x_organic: { bg: '#000000', fg: '#fff', glyph: '𝕏' },
  linkedin_organic: { bg: '#0A66C2', fg: '#fff', glyph: 'in' },
  instagram_organic: { bg: 'linear-gradient(135deg,#F58529,#DD2A7B,#8134AF)', fg: '#fff', glyph: '◉' },
  tiktok_organic: { bg: '#000000', fg: '#fff', glyph: '♪' },
  newsletter: { bg: '#475569', fg: '#fff', glyph: '✉' },
  influencer: { bg: '#7C3AED', fg: '#fff', glyph: '★' },
};

/** Small brand-ish monogram badge — dependency-free. */
export function ChannelIcon({ type, size = 22 }: ChannelIconProps) {
  const s = STYLES[type];
  const twoChar = s.glyph.length > 1;
  return (
    <span
      aria-hidden
      style={{
        width: size,
        height: size,
        background: s.bg,
        color: s.fg,
        boxShadow: s.ring ? `inset 0 0 0 1px ${s.ring}` : undefined,
        fontSize: size * (twoChar ? 0.42 : 0.6),
      }}
      className="inline-flex shrink-0 items-center justify-center rounded-md font-bold leading-none"
    >
      {s.glyph}
    </span>
  );
}
