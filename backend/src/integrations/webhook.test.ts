import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { signWebhookBody, WebhookCrmAdapter } from './crm/adapters/webhook.js';

describe('Webhook CRM adapter', () => {
  it('sends signed payload on success', async () => {
    const secret = 'test-secret';
    let captured: { url: string; init: RequestInit } | undefined;

    const adapter = new WebhookCrmAdapter({
      url: 'https://crm.example/hooks',
      secret,
      timeoutMs: 1000,
      businessName: 'Atelier Cut',
      businessType: 'barbershop',
      fetchImpl: (async (url, init) => {
        captured = { url: String(url), init: init ?? {} };
        return new Response('ok', { status: 200 });
      }) as typeof fetch,
    });

    const result = await adapter.createBooking({
      localAppointmentId: 1,
      status: 'confirmed',
      date: '2026-08-17',
      startTime: '10:00',
      endTime: '11:00',
      createdAt: '2026-08-12T09:00:00.000Z',
      service: { id: 1, name: 'Cut', price: 1500, durationMinutes: 60 },
      master: { id: 1, name: 'Alex', role: 'Barber' },
      customer: {
        telegramUserId: 111,
        username: 'ivan',
        firstName: 'Ivan',
        lastName: null,
        localClientId: 1,
      },
    });

    expect(result.ok).toBe(true);
    expect(captured?.url).toBe('https://crm.example/hooks');
    const body = String(captured?.init.body);
    const payload = JSON.parse(body) as { event: string; data: { localAppointmentId: number } };
    expect(payload.event).toBe('booking.created');
    expect(payload.data.localAppointmentId).toBe(1);

    const headers = captured?.init.headers as Record<string, string>;
    expect(headers['x-webhook-signature']).toBe(signWebhookBody(body, secret));
    expect(headers.authorization).toBe(`Bearer ${secret}`);
    expect(headers['x-webhook-signature']).toBe(
      `sha256=${createHmac('sha256', secret).update(body).digest('hex')}`,
    );
  });

  it('returns failure on HTTP error without throwing', async () => {
    const adapter = new WebhookCrmAdapter({
      url: 'https://crm.example/hooks',
      secret: 'secret',
      fetchImpl: (async () => new Response('nope', { status: 500 })) as typeof fetch,
    });

    const result = await adapter.cancelBooking({
      localAppointmentId: 2,
      status: 'cancelled',
      date: '2026-08-17',
      startTime: '10:00',
      endTime: '11:00',
      createdAt: '2026-08-12T09:00:00.000Z',
      service: { id: 1, name: 'Cut', price: 1500, durationMinutes: 60 },
      master: { id: 1, name: 'Alex', role: 'Barber' },
      customer: {
        telegramUserId: 111,
        username: null,
        firstName: 'Ivan',
        lastName: null,
        localClientId: 1,
      },
    });

    expect(result.ok).toBe(false);
    expect(result.error).toContain('500');
  });

  it('returns failure on timeout without throwing', async () => {
    const adapter = new WebhookCrmAdapter({
      url: 'https://crm.example/hooks',
      timeoutMs: 20,
      fetchImpl: (async (_url, init) => {
        await new Promise((_, reject) => {
          init?.signal?.addEventListener('abort', () => {
            const error = new Error('aborted');
            error.name = 'AbortError';
            reject(error);
          });
        });
        return new Response('ok');
      }) as typeof fetch,
    });

    const result = await adapter.createOrUpdateCustomer({
      telegramUserId: 1,
      username: null,
      firstName: 'A',
      lastName: null,
      localClientId: 1,
    });

    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/timeout/i);
  });
});
