import { describe, expect, it } from 'vitest';
import { createTourStorage, type StorageAdapter } from './storage';

function memoryAdapter(initial: Record<string, string> = {}): StorageAdapter {
  const store = new Map(Object.entries(initial));
  return {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => {
      store.set(key, value);
    },
    removeItem: (key) => {
      store.delete(key);
    },
  };
}

describe('tour storage', () => {
  it('treats a missing key as unseen so the intro can auto-start', () => {
    const storage = createTourStorage('barber.salesDemoTour.v1', memoryAdapter());
    expect(storage.hasBeenSeen()).toBe(false);
  });

  it('persists skip and complete locally without a backend', () => {
    const adapter = memoryAdapter();
    const storage = createTourStorage('barber.salesDemoTour.v1', adapter);
    storage.markSeen('skipped');
    expect(storage.hasBeenSeen()).toBe(true);
    expect(storage.readReason()).toBe('skipped');
    expect(adapter.getItem('barber.salesDemoTour.v1')).toContain('skipped');

    storage.markSeen('completed');
    expect(storage.readReason()).toBe('completed');
  });

  it('can be cleared so a manual restart still works', () => {
    const storage = createTourStorage('barber.salesDemoTour.v1', memoryAdapter());
    storage.markSeen('completed');
    storage.clear();
    expect(storage.hasBeenSeen()).toBe(false);
  });
});
