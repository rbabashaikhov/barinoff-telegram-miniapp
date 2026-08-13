import type {
  CrmAdapter,
  CrmBookingInput,
  CrmCustomerInput,
  CrmMasterInput,
  CrmResult,
  CrmServiceInput,
} from '../types.js';

export interface MockCrmAdapterOptions {
  fail?: boolean;
}

export class MockCrmAdapter implements CrmAdapter {
  readonly id = 'mock' as const;
  readonly calls: Array<{ method: string; input?: unknown }> = [];
  fail: boolean;

  constructor(options: MockCrmAdapterOptions = {}) {
    this.fail = Boolean(options.fail);
  }

  private result(): CrmResult {
    if (this.fail) {
      return { ok: false, error: 'Mock CRM failure' };
    }
    return { ok: true, id: 'mock' };
  }

  async createOrUpdateCustomer(input: CrmCustomerInput): Promise<CrmResult> {
    this.calls.push({ method: 'createOrUpdateCustomer', input });
    return this.result();
  }

  async createBooking(input: CrmBookingInput): Promise<CrmResult> {
    this.calls.push({ method: 'createBooking', input });
    return this.result();
  }

  async updateBooking(input: CrmBookingInput): Promise<CrmResult> {
    this.calls.push({ method: 'updateBooking', input });
    return this.result();
  }

  async cancelBooking(input: CrmBookingInput): Promise<CrmResult> {
    this.calls.push({ method: 'cancelBooking', input });
    return this.result();
  }

  async syncServices(services: CrmServiceInput[]): Promise<CrmResult> {
    this.calls.push({ method: 'syncServices', input: services });
    return this.result();
  }

  async syncMasters(masters: CrmMasterInput[]): Promise<CrmResult> {
    this.calls.push({ method: 'syncMasters', input: masters });
    return this.result();
  }
}
