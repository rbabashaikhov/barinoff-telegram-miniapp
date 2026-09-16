import Database from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { seed } from '../db/index.js';
import { applySchema } from '../db/schema.js';
import { eventBus } from '../events/bus.js';
import { createSqliteRepositories } from '../repositories/sqlite.js';
import type { Repositories } from '../repositories/types.js';
import {
  BookingConflictError,
  cancelAppointment,
  createAppointment,
  getAvailableSlots,
} from './booking.js';

function setup() {
  const db = new Database(':memory:');
  applySchema(db);
  seed(db);
  return { db, repos: createSqliteRepositories(db) };
}

// Seed order: Алексей is the first master, works Mon–Sat 10:00–20:00.
const ALEXANDER = 1;
const now = new Date(2026, 7, 12, 9, 0, 0);

describe('booking persistence', () => {
  let db: Database.Database;
  let repos: Repositories;

  beforeEach(() => {
    ({ db, repos } = setup());
  });

  afterEach(() => {
    eventBus.clear();
    db.close();
  });

  it('creates appointment and removes slot from availability', async () => {
    const date = '2026-08-17';

    const before = getAvailableSlots(repos, 1, ALEXANDER, date, now);
    expect(before).toContain('10:00');

    const created = await createAppointment(repos, {
      user: { id: 111, username: 'client1', first_name: 'Ivan' },
      serviceId: 1,
      masterId: ALEXANDER,
      date,
      startTime: '10:00',
      now,
    });

    expect(created.status).toBe('confirmed');
    expect(created.start_time).toBe('10:00');
    expect(created.end_time).toBe('11:00');
    expect(created.master_id).toBe(ALEXANDER);
    expect(created.master_name).toBe('Алексей');

    const after = getAvailableSlots(repos, 1, ALEXANDER, date, now);
    expect(after).not.toContain('10:00');
  });

  it('rejects overlapping double booking for the same master', async () => {
    const date = '2026-08-17';

    await createAppointment(repos, {
      user: { id: 111, username: 'client1', first_name: 'Ivan' },
      serviceId: 1,
      masterId: ALEXANDER,
      date,
      startTime: '12:00',
      now,
    });

    await expect(
      createAppointment(repos, {
        user: { id: 222, username: 'client2', first_name: 'Petr' },
        serviceId: 1,
        masterId: ALEXANDER,
        date,
        startTime: '12:00',
        now,
      }),
    ).rejects.toBeInstanceOf(BookingConflictError);

    // Service 2 ('Стрижка машинкой под одну насадку') is 30 min; start it so it still
    // overlaps the 12:00–13:00 appointment above regardless of the shorter duration.
    await expect(
      createAppointment(repos, {
        user: { id: 333, username: 'client3', first_name: 'Oleg' },
        serviceId: 2,
        masterId: ALEXANDER,
        date,
        startTime: '12:30',
        now,
      }),
    ).rejects.toBeInstanceOf(BookingConflictError);
  });

  it('restores availability after cancellation', async () => {
    const date = '2026-08-18';

    const created = await createAppointment(repos, {
      user: { id: 444, username: 'client4', first_name: 'Anna' },
      serviceId: 1,
      masterId: ALEXANDER,
      date,
      startTime: '15:00',
      now,
    });

    expect(getAvailableSlots(repos, 1, ALEXANDER, date, now)).not.toContain('15:00');

    await cancelAppointment(repos, created.id, 444);

    expect(getAvailableSlots(repos, 1, ALEXANDER, date, now)).toContain('15:00');
  });

  it('excludes blocked slots from availability and booking', async () => {
    const date = '2026-08-17';
    repos.blockedSlots.create({
      masterId: ALEXANDER,
      date,
      startTime: '13:00',
      endTime: '14:00',
      reason: 'break',
    });

    expect(getAvailableSlots(repos, 1, ALEXANDER, date, now)).not.toContain('13:00');

    await expect(
      createAppointment(repos, {
        user: { id: 555, first_name: 'Blocked' },
        serviceId: 1,
        masterId: ALEXANDER,
        date,
        startTime: '13:00',
        now,
      }),
    ).rejects.toBeInstanceOf(BookingConflictError);
  });

  it('excludes non-working time', async () => {
    const date = '2026-08-17';
    expect(getAvailableSlots(repos, 1, ALEXANDER, date, now)).not.toContain('09:00');
    expect(getAvailableSlots(repos, 1, ALEXANDER, date, now)).not.toContain('20:00');

    await expect(
      createAppointment(repos, {
        user: { id: 556, first_name: 'Early' },
        serviceId: 1,
        masterId: ALEXANDER,
        date,
        startTime: '09:00',
        now,
      }),
    ).rejects.toBeInstanceOf(BookingConflictError);
  });

  it('does not book an inactive master', async () => {
    db.prepare('UPDATE masters SET active = 0 WHERE id = ?').run(ALEXANDER);

    await expect(
      createAppointment(repos, {
        user: { id: 557, first_name: 'Inactive master' },
        serviceId: 1,
        masterId: ALEXANDER,
        date: '2026-08-17',
        startTime: '10:00',
        now,
      }),
    ).rejects.toMatchObject({ code: 'MASTER_NOT_FOUND' });
  });

  it('does not book an inactive service', async () => {
    db.prepare('UPDATE services SET active = 0 WHERE id = ?').run(1);

    await expect(
      createAppointment(repos, {
        user: { id: 558, first_name: 'Inactive service' },
        serviceId: 1,
        masterId: ALEXANDER,
        date: '2026-08-17',
        startTime: '10:00',
        now,
      }),
    ).rejects.toMatchObject({ code: 'SERVICE_NOT_FOUND' });
  });
});
