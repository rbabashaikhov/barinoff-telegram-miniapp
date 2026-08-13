import { createHmac } from 'node:crypto';
import { config } from '../../../config.js';
import { logger } from '../../../logger.js';
import type {
  CrmAdapter,
  CrmBookingInput,
  CrmCustomerInput,
  CrmMasterInput,
  CrmResult,
  CrmServiceInput,
  WebhookEnvelope,
} from '../types.js';

export interface WebhookCrmAdapterOptions {
  url: string;
  secret?: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
  businessName?: string;
  businessType?: string;
}

export function signWebhookBody(body: string, secret: string): string {
  const digest = createHmac('sha256', secret).update(body).digest('hex');
  return `sha256=${digest}`;
}

export class WebhookCrmAdapter implements CrmAdapter {
  readonly id = 'webhook' as const;
  private readonly url: string;
  private readonly secret: string;
  private readonly timeoutMs: number;
  private readonly fetchImpl: typeof fetch;
  private readonly businessName: string;
  private readonly businessType: string;

  constructor(options: WebhookCrmAdapterOptions) {
    this.url = options.url;
    this.secret = options.secret ?? '';
    this.timeoutMs = options.timeoutMs ?? 5000;
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.businessName = options.businessName ?? config.business.name;
    this.businessType = options.businessType ?? config.business.type;
  }

  async createOrUpdateCustomer(input: CrmCustomerInput): Promise<CrmResult> {
    return this.post('customer.upserted', input);
  }

  async createBooking(input: CrmBookingInput): Promise<CrmResult> {
    return this.post('booking.created', input);
  }

  async updateBooking(input: CrmBookingInput): Promise<CrmResult> {
    return this.post('booking.updated', input);
  }

  async cancelBooking(input: CrmBookingInput): Promise<CrmResult> {
    return this.post('booking.cancelled', input);
  }

  async syncServices(services: CrmServiceInput[]): Promise<CrmResult> {
    return this.post('services.sync', { services });
  }

  async syncMasters(masters: CrmMasterInput[]): Promise<CrmResult> {
    return this.post('masters.sync', { masters });
  }

  private async post(event: string, data: unknown): Promise<CrmResult> {
    const envelope: WebhookEnvelope = {
      event,
      occurredAt: new Date().toISOString(),
      business: {
        name: this.businessName,
        type: this.businessType,
      },
      data,
    };
    const body = JSON.stringify(envelope);
    const headers: Record<string, string> = {
      'content-type': 'application/json',
      'x-webhook-event': event,
    };

    if (this.secret) {
      headers['x-webhook-signature'] = signWebhookBody(body, this.secret);
      headers.authorization = `Bearer ${this.secret}`;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await this.fetchImpl(this.url, {
        method: 'POST',
        headers,
        body,
        signal: controller.signal,
      });

      if (!response.ok) {
        const error = `Webhook HTTP ${response.status}`;
        logger.error('CRM webhook request failed', { event, error });
        return { ok: false, error };
      }

      logger.info('CRM webhook delivered', { event, status: response.status });
      return { ok: true, id: String(response.status) };
    } catch (error) {
      const message =
        error instanceof Error && error.name === 'AbortError'
          ? `Webhook timeout after ${this.timeoutMs}ms`
          : error instanceof Error
            ? error.message
            : 'Webhook request failed';
      logger.error('CRM webhook request failed', { event, error: message });
      return { ok: false, error: message };
    } finally {
      clearTimeout(timer);
    }
  }
}
