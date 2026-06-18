// Shareable links — encode the whole project into the URL hash so a campaign can
// be shared or bookmarked across devices, keeping the no-backend constraint.
import type { Project } from '../engine/types';
import { isValidProject } from '../state/persistence';

const HASH_PREFIX = 'p=';

function toBase64(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

function fromBase64(s: string): string {
  const bin = atob(s);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function encodeProject(project: Project): string {
  return toBase64(JSON.stringify(project));
}

export function shareUrl(project: Project): string {
  const base = `${window.location.origin}${window.location.pathname}`;
  return `${base}#${HASH_PREFIX}${encodeProject(project)}`;
}

/** Read a shared project from the URL hash, if present and valid. */
export function loadSharedProject(): Project | null {
  if (typeof window === 'undefined') return null;
  const hash = window.location.hash.replace(/^#/, '');
  if (!hash.startsWith(HASH_PREFIX)) return null;
  try {
    const parsed: unknown = JSON.parse(fromBase64(hash.slice(HASH_PREFIX.length)));
    return isValidProject(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/** Remove the share payload from the URL so it doesn't reload over later edits. */
export function clearShareHash(): void {
  if (typeof window === 'undefined' || !window.location.hash) return;
  try {
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
  } catch {
    /* ignore */
  }
}
