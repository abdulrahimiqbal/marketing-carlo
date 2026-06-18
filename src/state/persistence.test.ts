import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Project } from '../engine/types';

// Mock window.localStorage. persistence reads `window` lazily (at call time), so
// stubbing here — after the hoisted import — is fine.
const mem = new Map<string, string>();
vi.stubGlobal('window', {
  localStorage: {
    getItem: (k: string) => (mem.has(k) ? mem.get(k)! : null),
    setItem: (k: string, v: string) => void mem.set(k, v),
    removeItem: (k: string) => void mem.delete(k),
  },
});

import { loadProject, saveProjectDebounced, clearStoredProject } from './persistence';

const KEY = 'campaign-canvas-project-v1';
const sample: Project = {
  id: 'p1',
  name: 'Launch',
  vertical: 'b2b_saas',
  nodes: [],
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
};

describe('persistence', () => {
  beforeEach(() => mem.clear());

  it('returns null when nothing is stored', () => {
    expect(loadProject()).toBeNull();
  });

  it('round-trips a project through a debounced save (§14 reload)', () => {
    vi.useFakeTimers();
    saveProjectDebounced(sample, 10);
    vi.advanceTimersByTime(20);
    vi.useRealTimers();
    expect(loadProject()).toEqual(sample);
  });

  it('rejects corrupt or wrong-shaped payloads', () => {
    mem.set(KEY, '{ not json');
    expect(loadProject()).toBeNull();
    mem.set(KEY, JSON.stringify({ foo: 1 }));
    expect(loadProject()).toBeNull();
  });

  it('clears the stored project', () => {
    mem.set(KEY, JSON.stringify(sample));
    clearStoredProject();
    expect(loadProject()).toBeNull();
  });
});
