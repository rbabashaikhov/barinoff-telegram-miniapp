import { describe, expect, it } from 'vitest';
import { isDemoAdminPreviewEnabled, publicAppConfig } from './config.js';

describe('publicAppConfig', () => {
  it('does not expose ADMIN_TOKEN, CRM secrets, or an admin object', () => {
    const published = publicAppConfig();
    const json = JSON.stringify(published);
    expect(json).not.toMatch(/ADMIN_TOKEN|adminToken|webhookSecret|telegramBotToken/i);
    expect(published).not.toHaveProperty('admin');
    expect(published).not.toHaveProperty('crm');
    expect(published).not.toHaveProperty('telegramBotToken');
  });

  it('publishes sales demo feature flags without secrets', () => {
    const published = publicAppConfig();
    expect(typeof published.features.demoTour).toBe('boolean');
    expect(typeof published.features.demoAdminPreview).toBe('boolean');
  });
});

describe('isDemoAdminPreviewEnabled', () => {
  it('requires both browser demo mode and the feature flag', () => {
    expect(
      isDemoAdminPreviewEnabled({
        allowDemoMode: true,
        features: { demoAdminPreview: true },
      }),
    ).toBe(true);
    expect(
      isDemoAdminPreviewEnabled({
        allowDemoMode: false,
        features: { demoAdminPreview: true },
      }),
    ).toBe(false);
    expect(
      isDemoAdminPreviewEnabled({
        allowDemoMode: true,
        features: { demoAdminPreview: false },
      }),
    ).toBe(false);
  });
});
