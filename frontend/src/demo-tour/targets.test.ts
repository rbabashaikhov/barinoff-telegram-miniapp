import { describe, expect, it } from 'vitest';
import { findTourTarget, tourTargetSelector, waitForTourTarget } from './targets';

function fakeRoot(hook: string | null): ParentNode {
  return {
    querySelector(selector: string) {
      if (hook && selector === tourTargetSelector(hook)) {
        return { id: hook } as unknown as Element;
      }
      return null;
    },
  } as ParentNode;
}

describe('tour targets', () => {
  it('uses stable data-demo-tour hooks instead of CSS nth-child paths', () => {
    expect(tourTargetSelector('service-selection')).toBe('[data-demo-tour="service-selection"]');
    expect(tourTargetSelector('master-selection')).toBe('[data-demo-tour="master-selection"]');
  });

  it('returns null when the target is missing instead of throwing', async () => {
    expect(findTourTarget('missing', fakeRoot(null))).toBeNull();
    expect(findTourTarget('', fakeRoot('service-selection'))).toBeNull();
    await expect(
      waitForTourTarget('missing', { root: fakeRoot(null), timeoutMs: 40, intervalMs: 10 }),
    ).resolves.toBeNull();
  });

  it('finds a present hook', () => {
    const found = findTourTarget('available-slots', fakeRoot('available-slots'));
    expect(found).toMatchObject({ id: 'available-slots' });
  });
});
