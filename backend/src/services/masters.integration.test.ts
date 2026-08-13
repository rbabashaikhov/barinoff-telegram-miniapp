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
  listMasters,
} from './booking.js';

function setup() {
  const db = new Database(':memory:');
  applySchema(db);
  seed(db);
  return { db, repos: createSqliteRepositories(db) };
}

const ALEXANDER = 1;
const MAXIM = 2;
const ARTEM = 3;
const now = new Date(2026, 7, 12, 8, 0, 0);

describe('masters and per-master booking', () => {
  let db: Database.Database;
  let repos: Repositories;

  beforeEach(() => {
    ({ db, repos } = setup());
  });

  afterEach(() => {
    eventBus.clear();
    db.close();
  });

  it('returns seeded active masters', () => {
    const masters = listMasters(repos);
    expect(masters.map((m) => m.name)).toEqual([
      'Александр',
      'Максим',
      'Артём',
      'Даниил',
      'Никита',
    ]);
  });

  it('filters masters by service', () => {
    const forHaircut = listMasters(repos, 1);
    expect(forHaircut).toHaveLength(5);

    db.prepare('DELETE FROM master_services WHERE master_id = ? AND service_id = ?').run(
      MAXIM,
      1,
    );
    const filtered = listMasters(repos, 1);
    expect(filtered.map((m) => m.id)).not.toContain(MAXIM);
    expect(filtered).toHaveLength(4);
  });

  it('availability depends on the selected master schedule', () => {
    const monday = '2026-08-17';
    const sunday = '2026-08-16';

    const alexanderMonday = getAvailableSlots(repos, 1, ALEXANDER, monday, now);
    const maximMonday = getAvailableSlots(repos, 1, MAXIM, monday, now);
    const artemMonday = getAvailableSlots(repos, 1, ARTEM, monday, now);

    expect(alexanderMonday).toContain('10:00');
    expect(alexanderMonday).toContain('19:00');
    expect(maximMonday).toContain('09:00');
    expect(maximMonday).not.toContain('18:00');
    expect(artemMonday).toEqual([]);

    expect(getAvailableSlots(repos, 1, ALEXANDER, sunday, now)).toEqual([]);
    expect(getAvailableSlots(repos, 1, 4, sunday, now)).toContain('10:00');
  });

  it('stores master_id on appointment', async () => {
    const created = await createAppointment(repos, {
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

  it('forbids overlap for one master and allows the same slot for another', async () => {
    const date = '2026-08-17';

    await createAppointment(repos, {
      user: { id: 11, first_name: 'A' },
      serviceId: 1,
      masterId: ALEXANDER,
      date,
      startTime: '12:00',
      now,
    });

    await expect(
      createAppointment(repos, {
        user: { id: 12, first_name: 'B' },
        serviceId: 1,
        masterId: ALEXANDER,
        date,
        startTime: '12:00',
        now,
      }),
    ).rejects.toBeInstanceOf(BookingConflictError);

    const other = await createAppointment(repos, {
      user: { id: 13, first_name: 'C' },
      serviceId: 1,
      masterId: MAXIM,
      date,
      startTime: '12:00',
      now,
    });
    expect(other.master_id).toBe(MAXIM);
    expect(getAvailableSlots(repos, 1, MAXIM, date, now)).not.toContain('12:00');
    expect(getAvailableSlots(repos, 1, ALEXANDER, date, now)).not.toContain('12:00');
  });

  it('blocked slot of one master does not block another', () => {
    const date = '2026-08-17';
    db.prepare(
      `
      INSERT INTO blocked_slots (master_id, blocked_date, start_time, end_time, reason)
      VALUES (?, ?, '12:00', '13:00', 'break')
    `,
    ).run(ALEXANDER, date);

    expect(getAvailableSlots(repos, 1, ALEXANDER, date, now)).not.toContain('12:00');
    expect(getAvailableSlots(repos, 1, MAXIM, date, now)).toContain('12:00');
  });

  it('cancel restores the slot only for that master', async () => {
    const date = '2026-08-18';
    const created = await createAppointment(repos, {
      user: { id: 20, first_name: 'Anna' },
      serviceId: 1,
      masterId: ALEXANDER,
      date,
      startTime: '14:00',
      now,
    });

    await createAppointment(repos, {
      user: { id: 21, first_name: 'Oleg' },
      serviceId: 1,
      masterId: MAXIM,
      date,
      startTime: '14:00',
      now,
    });

    expect(getAvailableSlots(repos, 1, ALEXANDER, date, now)).not.toContain('14:00');
    expect(getAvailableSlots(repos, 1, MAXIM, date, now)).not.toContain('14:00');

    await cancelAppointment(repos, created.id, 20);

    expect(getAvailableSlots(repos, 1, ALEXANDER, date, now)).toContain('14:00');
    expect(getAvailableSlots(repos, 1, MAXIM, date, now)).not.toContain('14:00');
  });
});
