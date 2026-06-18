// Seeded RNG + triangular sampling (§5.4).
// A seeded generator makes results reproducible per node state: the same
// inputs must always produce the same range.

/**
 * mulberry32 — small, fast, deterministic PRNG. Returns a function producing
 * uniform floats in [0, 1). Seed is a 32-bit unsigned integer.
 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function next(): number {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Triangular inverse-CDF sample (§5.4) — implemented exactly as specified.
 * `u` is a uniform draw in [0, 1); pass one from a seeded generator.
 */
export function sampleTriangular(
  low: number,
  mode: number,
  high: number,
  u = Math.random(),
): number {
  if (high === low) return low;
  const fc = (mode - low) / (high - low);
  return u < fc
    ? low + Math.sqrt(u * (high - low) * (mode - low))
    : high - Math.sqrt((1 - u) * (high - low) * (high - mode));
}

/**
 * Deterministic 32-bit hash (FNV-1a) of a string. Used to derive a stable RNG
 * seed from a node's state so re-simulating identical node state reproduces the
 * same range — while distinct nodes get distinct (independent) streams.
 */
export function hashString(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
