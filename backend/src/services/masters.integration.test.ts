import Database from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { seed } from '../db/index.js';
import { applySchema } from '../db/schema.js';
import {
  BookingConflictError,
  cancelAppointment,
  createAppointment,
  getAvailableSlots,
  listMasters,
} from './booking.js';

function setupDb(): Database.Database {
  const db = new Database(':memory:');
  applySchema(db);
  seed(db);
  return db;
}

const ALEXANDER = 1;
const MAXIM = 2;
const ARTEM = 3;
const now = new Date(2026, 7, 12, 8, 0, 0);

describe('masters and per-master booking', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = setupDb();
  });

  afterEach(() => {
    db.close();
  });

  it('returns seeded active masters', () => {
    const masters = listMasters(db);
    expect(masters.map((m) => m.name)).toEqual([
      'Александр',
      'Максим',
      'Артём',
      'Даниил',
      'Никита',
    ]);
  });

  it('filters masters by service', () => {
    const forHaircut = listMasters(db, 1);
    expect(forHaircut).toHaveLength(5);

    db.prepare('DELETE FROM master_services WHERE master_id = ? AND service_id = ?').run(
      MAXIM,
      1,
    );
    const filtered = listMasters(db, 1);
    expect(filtered.map((m) => m.id)).not.toContain(MAXIM);
    expect(filtered).toHaveLength(4);
  });

  it('availability depends on the selected master schedule', () => {
    const monday = '2026-08-17';
    const sunday = '2026-08-16';

    const alexanderMonday = getAvailableSlots(db, 1, ALEXANDER, monday, now);
    const maximMonday = getAvailableSlots(db, 1, MAXIM, monday, now);
    const artemMonday = getAvailableSlots(db, 1, ARTEM, monday, now);

    expect(alexanderMonday).toContain('10:00');
    expect(alexanderMonday).toContain('19:00');
    expect(maximMonday).toContain('09:00');
    expect(maximMonday).not.toContain('18:00');
    expect(artemMonday).toEqual([]);

    expect(getAvailableSlots(db, 1, ALEXANDER, sunday, now)).toEqual([]);
    expect(getAvailableSlots(db, 1, 4, sunday, now)).toContain('10:00');
  });

  it('stores master_id on appointment', () => {
    const created = createAppointment(db, {
      user: { id: 10, first_name: 'Ivan' },
      serviceId: 1,
      masterId: MAXIM,
      date: '2026-08-17',
      startTime: '09:00',
      now,
    });
    expect(created.master_id).toBe(MAXIM);
    expect(created.master_name).toBe('Максим');
  });

  it('forbids overlap for one master and allows the same slot for another', () => {
    const date = '2026-08-17';

    createAppointment(db, {
      user: { id: 11, first_name: 'A' },
      serviceId: 1,
      masterId: ALEXANDER,
      date,
      startTime: '12:00',
      now,
    });

    expect(() =>
      createAppointment(db, {
        user: { id: 12, first_name: 'B' },
        serviceId: 1,
        masterId: ALEXANDER,
        date,
        startTime: '12:00',
        now,
      }),
    ).toThrow(BookingConflictError);

    const other = createAppointment(db, {
      user: { id: 13, first_name: 'C' },
      serviceId: 1,
      masterId: MAXIM,
      date,
      startTime: '12:00',
      now,
    });
    expect(other.master_id).toBe(MAXIM);
    expect(getAvailableSlots(db, 1, MAXIM, date, now)).not.toContain('12:00');
    expect(getAvailableSlots(db, 1, ALEXANDER, date, now)).not.toContain('12:00');
  });

  it('blocked slot of one master does not block another', () => {
    const date = '2026-08-17';
    db.prepare(
      `
      INSERT INTO blocked_slots (master_id, blocked_date, start_time, end_time, reason)
      VALUES (?, ?, '12:00', '13:00', 'break')
    `,
    ).run(ALEXANDER, date);

    expect(getAvailableSlots(db, 1, ALEXANDER, date, now)).not.toContain('12:00');
    expect(getAvailableSlots(db, 1, MAXIM, date, now)).toContain('12:00');
  });

  it('cancel restores the slot only for that master', () => {
    const date = '2026-08-18';
    const created = createAppointment(db, {
      user: { id: 20, first_name: 'Anna' },
      serviceId: 1,
      masterId: ALEXANDER,
      date,
      startTime: '14:00',
      now,
    });

    createAppointment(db, {
      user: { id: 21, first_name: 'Oleg' },
      serviceId: 1,
      masterId: MAXIM,
      date,
      startTime: '14:00',
      now,
    });

    expect(getAvailableSlots(db, 1, ALEXANDER, date, now)).not.toContain('14:00');
    expect(getAvailableSlots(db, 1, MAXIM, date, now)).not.toContain('14:00');

    cancelAppointment(db, created.id, 20);

    expect(getAvailableSlots(db, 1, ALEXANDER, date, now)).toContain('14:00');
    expect(getAvailableSlots(db, 1, MAXIM, date, now)).not.toContain('14:00');
  });
});
