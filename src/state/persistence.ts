// localStorage load/save (debounced). Single user, no backend (§3).
import type { Project } from '../engine/types';

const STORAGE_KEY = 'campaign-canvas-project-v1';

function hasStorage(): boolean {
  try {
    return typeof window !== 'undefined' && !!window.localStorage;
  } catch {
    return false;
  }
}

/** Minimal shape check so a corrupt/old payload can't crash the app. */
export function isValidProject(value: unknown): value is Project {
  if (!value || typeof value !== 'object') return false;
  const p = value as Record<string, unknown>;
  return (
    typeof p.id === 'string' &&
    typeof p.name === 'string' &&
    typeof p.vertical === 'string' &&
    Array.isArray(p.nodes)
  );
}

export function loadProject(): Project | null {
  if (!hasStorage()) return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isValidProject(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function saveProjectNow(project: Project): void {
  if (!hasStorage()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
  } catch {
    // Quota or privacy mode — fail quietly; the app still works in-memory.
  }
}

let timer: ReturnType<typeof setTimeout> | null = null;

/** Debounced save so rapid edits don't thrash localStorage. */
export function saveProjectDebounced(project: Project, delay = 400): void {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => saveProjectNow(project), delay);
}

export function clearStoredProject(): void {
  if (!hasStorage()) return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
