import Database from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { seed } from '../db/index.js';
import { applySchema } from '../db/schema.js';
import {
  BookingConflictError,
  cancelAppointment,
  createAppointment,
  getAvailableSlots,
} from './booking.js';

function setupDb(): Database.Database {
  const db = new Database(':memory:');
  applySchema(db);
  seed(db);
  return db;
}

const ALEXANDER = 1;
const now = new Date(2026, 7, 12, 9, 0, 0);

describe('booking persistence', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = setupDb();
  });

  afterEach(() => {
    db.close();
  });

  it('creates appointment and removes slot from availability', () => {
    const date = '2026-08-17'; // Monday — Александр 10:00–20:00

    const before = getAvailableSlots(db, 1, ALEXANDER, date, now);
    expect(before).toContain('10:00');

    const created = createAppointment(db, {
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
    expect(created.master_name).toBe('Александр');

    const after = getAvailableSlots(db, 1, ALEXANDER, date, now);
    expect(after).not.toContain('10:00');
  });

  it('rejects overlapping double booking for the same master', () => {
    const date = '2026-08-17';

    createAppointment(db, {
      user: { id: 111, username: 'client1', first_name: 'Ivan' },
      serviceId: 1,
      masterId: ALEXANDER,
      date,
      startTime: '12:00',
      now,
    });

    expect(() =>
      createAppointment(db, {
        user: { id: 222, username: 'client2', first_name: 'Petr' },
        serviceId: 1,
        masterId: ALEXANDER,
        date,
        startTime: '12:00',
        now,
      }),
    ).toThrow(BookingConflictError);

    expect(() =>
      createAppointment(db, {
        user: { id: 333, username: 'client3', first_name: 'Oleg' },
        serviceId: 2,
        masterId: ALEXANDER,
        date,
        startTime: '11:00',
        now,
      }),
    ).toThrow(BookingConflictError);
  });

  it('restores availability after cancellation', () => {
    const date = '2026-08-18'; // Tuesday

    const created = createAppointment(db, {
      user: { id: 444, username: 'client4', first_name: 'Anna' },
      serviceId: 3,
      masterId: ALEXANDER,
      date,
      startTime: '15:00',
      now,
    });

    expect(getAvailableSlots(db, 3, ALEXANDER, date, now)).not.toContain('15:00');

    cancelAppointment(db, created.id, 444);

    expect(getAvailableSlots(db, 3, ALEXANDER, date, now)).toContain('15:00');
  });
});
