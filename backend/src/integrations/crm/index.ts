import { config } from '../../config.js';
import { logger } from '../../logger.js';
import { LocalCrmAdapter } from './adapters/local.js';
import { MockCrmAdapter } from './adapters/mock.js';
import { WebhookCrmAdapter } from './adapters/webhook.js';
import type { CrmAdapter } from './types.js';

export function createCrmAdapter(): CrmAdapter {
  const { adapter, webhookUrl, webhookSecret, timeoutMs } = config.crm;

  if (adapter === 'mock') {
    logger.info('CRM adapter: mock');
    return new MockCrmAdapter();
  }

  if (adapter === 'webhook') {
    if (!webhookUrl) {
      throw new Error('CRM_ADAPTER=webhook requires CRM_WEBHOOK_URL');
    }
    if (!webhookSecret) {
      logger.warn('CRM_WEBHOOK_SECRET is empty; webhook requests will be unsigned');
    }
    logger.info('CRM adapter: webhook', { timeoutMs });
    return new WebhookCrmAdapter({
      url: webhookUrl,
      secret: webhookSecret,
      timeoutMs,
    });
  }

  logger.info('CRM adapter: local (demo SQLite is the source of truth)');
  return new LocalCrmAdapter();
}

export type { CrmAdapter } from './types.js';
export { LocalCrmAdapter } from './adapters/local.js';
export { MockCrmAdapter } from './adapters/mock.js';
export { WebhookCrmAdapter, signWebhookBody } from './adapters/webhook.js';
