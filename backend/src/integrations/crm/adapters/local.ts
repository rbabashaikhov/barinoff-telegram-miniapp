import { logger } from '../../../logger.js';
import type { CrmAdapter, CrmResult } from '../types.js';

export class LocalCrmAdapter implements CrmAdapter {
  readonly id = 'local' as const;

  async createOrUpdateCustomer(): Promise<CrmResult> {
    return { ok: true, id: 'local' };
  }

  async createBooking(): Promise<CrmResult> {
    return { ok: true, id: 'local' };
  }

  async updateBooking(): Promise<CrmResult> {
    return { ok: true, id: 'local' };
  }

  async cancelBooking(): Promise<CrmResult> {
    return { ok: true, id: 'local' };
  }

  async syncServices(): Promise<CrmResult> {
    logger.info('CRM local adapter: syncServices skipped');
    return { ok: true, id: 'local' };
  }

  async syncMasters(): Promise<CrmResult> {
    logger.info('CRM local adapter: syncMasters skipped');
    return { ok: true, id: 'local' };
  }
}
