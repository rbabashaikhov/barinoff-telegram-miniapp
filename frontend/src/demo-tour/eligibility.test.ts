import { describe, expect, it } from 'vitest';
import {
  canRunSalesDemoTour,
  canShowSalesDemoChrome,
  isSalesDemoAdminPath,
  shouldAutoStartTour,
} from './eligibility';

const demo = {
  isDemo: true,
  isTelegram: false,
  demoMode: true,
  demoTourEnabled: true,
  isAdminPath: false,
};

describe('sales demo eligibility', () => {
  it('auto-starts only in browser demo on the first visit', () => {
    expect(shouldAutoStartTour({ ...demo, hasBeenSeen: false })).toBe(true);
    expect(shouldAutoStartTour({ ...demo, hasBeenSeen: true })).toBe(false);
  });

  it('does not run in Telegram, production client mode, or admin', () => {
    expect(canRunSalesDemoTour({ ...demo, isTelegram: true })).toBe(false);
    expect(canRunSalesDemoTour({ ...demo, isDemo: false })).toBe(false);
    expect(canRunSalesDemoTour({ ...demo, demoMode: false })).toBe(false);
    expect(canRunSalesDemoTour({ ...demo, demoTourEnabled: false })).toBe(false);
    expect(canRunSalesDemoTour({ ...demo, isAdminPath: true })).toBe(false);
  });

  it('keeps a manual restart available in browser demo', () => {
    expect(canRunSalesDemoTour(demo)).toBe(true);
    expect(canShowSalesDemoChrome({ ...demo, demoAdminPreviewEnabled: true })).toBe(true);
  });

  it('hides chrome when both sales flags are off', () => {
    expect(
      canShowSalesDemoChrome({
        ...demo,
        demoTourEnabled: false,
        demoAdminPreviewEnabled: false,
      }),
    ).toBe(false);
  });

  it('treats /admin and /demo/admin as admin paths', () => {
    expect(isSalesDemoAdminPath('/admin')).toBe(true);
    expect(isSalesDemoAdminPath('/demo/admin')).toBe(true);
    expect(isSalesDemoAdminPath('/services')).toBe(false);
  });
});
