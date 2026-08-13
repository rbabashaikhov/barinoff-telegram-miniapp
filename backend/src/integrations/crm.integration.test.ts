import Database from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { seed } from '../db/index.js';
import { applySchema } from '../db/schema.js';
import { eventBus } from '../events/bus.js';
import { MockCrmAdapter } from '../integrations/crm/adapters/mock.js';
import { registerCrmListeners } from '../integrations/listeners.js';
import { createSqliteRepositories } from '../repositories/sqlite.js';
import type { Repositories } from '../repositories/types.js';
import { createAppointment } from '../services/booking.js';

function setup() {
  const db = new Database(':memory:');
  applySchema(db);
  seed(db);
  return { db, repos: createSqliteRepositories(db) };
}

const now = new Date(2026, 7, 12, 9, 0, 0);

describe('CRM integration isolation', () => {
  let db: Database.Database;
  let repos: Repositories;

  beforeEach(() => {
    ({ db, repos } = setup());
    eventBus.clear();
  });

  afterEach(() => {
    eventBus.clear();
    db.close();
  });

  it('keeps local booking when CRM adapter fails', async () => {
    const crm = new MockCrmAdapter({ fail: true });
    registerCrmListeners(eventBus, crm);

    const created = await createAppointment(repos, {
      user: { id: 901, first_name: 'CRM', last_name: 'Fail' },
      serviceId: 1,
      masterId: 1,
      date: '2026-08-17',
      startTime: '10:00',
      now,
    });

    expect(created.status).toBe('confirmed');
    expect(repos.appointments.getById(created.id)?.status).toBe('confirmed');
    expect(crm.calls.some((call) => call.method === 'createBooking')).toBe(true);
  });

  it('calls CRM on successful booking', async () => {
    const crm = new MockCrmAdapter();
    registerCrmListeners(eventBus, crm);

    await createAppointment(repos, {
      user: { id: 902, first_name: 'CRM', last_name: 'Ok' },
      serviceId: 1,
      masterId: 1,
      date: '2026-08-17',
      startTime: '11:00',
      now,
    });

    expect(crm.calls.map((call) => call.method)).toEqual([
      'createOrUpdateCustomer',
      'createOrUpdateCustomer',
      'createBooking',
    ]);
  });
});
