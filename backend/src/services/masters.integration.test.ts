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

// Seed order: Алексей, Роман (barbers, all non-braiding services), Полина (braiding only).
const ALEXEY = 1;
const ROMAN = 2;
// Seed order: 'Мужская стрижка' is the first service, 'Брейдинг' is the first braiding-only one.
const HAIRCUT = 1;
const BRAIDING = 25;
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
    expect(masters.map((m) => m.name)).toEqual(['Алексей', 'Роман', 'Полина']);
  });

  it('filters masters by service', () => {
    const forHaircut = listMasters(repos, HAIRCUT);
    expect(forHaircut.map((m) => m.name)).toEqual(['Алексей', 'Роман']);

    const forBraiding = listMasters(repos, BRAIDING);
    expect(forBraiding.map((m) => m.name)).toEqual(['Полина']);

    db.prepare('DELETE FROM master_services WHERE master_id = ? AND service_id = ?').run(
      ROMAN,
      HAIRCUT,
    );
    const filtered = listMasters(repos, HAIRCUT);
    expect(filtered.map((m) => m.id)).not.toContain(ROMAN);
    expect(filtered).toHaveLength(1);
  });

  it('availability depends on the selected master schedule', () => {
    const monday = '2026-08-17';
    const sunday = '2026-08-16';

    // Алексей works Mon–Sat 10:00–20:00; Роман works Tue–Sun 11:00–21:00.
    const alexeyMonday = getAvailableSlots(repos, HAIRCUT, ALEXEY, monday, now);
    const romanMonday = getAvailableSlots(repos, HAIRCUT, ROMAN, monday, now);

    expect(alexeyMonday).toContain('10:00');
    expect(alexeyMonday).toContain('19:00');
    expect(romanMonday).toEqual([]);

    expect(getAvailableSlots(repos, HAIRCUT, ALEXEY, sunday, now)).toEqual([]);
    expect(getAvailableSlots(repos, HAIRCUT, ROMAN, sunday, now)).toContain('11:00');
  });

  it('stores master_id on appointment', async () => {
    const created = await createAppointment(repos, {
      user: { id: 10, first_name: 'Ivan' },
      serviceId: HAIRCUT,
      masterId: ROMAN,
      date: '2026-08-18',
      startTime: '11:00',
      now,
    });
    expect(created.master_id).toBe(ROMAN);
    expect(created.master_name).toBe('Роман');
  });

  it('forbids overlap for one master and allows the same slot for another', async () => {
    const date = '2026-08-18';

    await createAppointment(repos, {
      user: { id: 11, first_name: 'A' },
      serviceId: HAIRCUT,
      masterId: ALEXEY,
      date,
      startTime: '12:00',
      now,
    });

    await expect(
      createAppointment(repos, {
        user: { id: 12, first_name: 'B' },
        serviceId: HAIRCUT,
        masterId: ALEXEY,
        date,
        startTime: '12:00',
        now,
      }),
    ).rejects.toBeInstanceOf(BookingConflictError);

    const other = await createAppointment(repos, {
      user: { id: 13, first_name: 'C' },
      serviceId: HAIRCUT,
      masterId: ROMAN,
      date,
      startTime: '12:00',
      now,
    });
    expect(other.master_id).toBe(ROMAN);
    expect(getAvailableSlots(repos, HAIRCUT, ROMAN, date, now)).not.toContain('12:00');
    expect(getAvailableSlots(repos, HAIRCUT, ALEXEY, date, now)).not.toContain('12:00');
  });

  it('blocked slot of one master does not block another', () => {
    const date = '2026-08-18';
    db.prepare(
      `
      INSERT INTO blocked_slots (master_id, blocked_date, start_time, end_time, reason)
      VALUES (?, ?, '12:00', '13:00', 'break')
    `,
    ).run(ALEXEY, date);

    expect(getAvailableSlots(repos, HAIRCUT, ALEXEY, date, now)).not.toContain('12:00');
    expect(getAvailableSlots(repos, HAIRCUT, ROMAN, date, now)).toContain('12:00');
  });

  it('cancel restores the slot only for that master', async () => {
    const date = '2026-08-19';
    const created = await createAppointment(repos, {
      user: { id: 20, first_name: 'Anna' },
      serviceId: HAIRCUT,
      masterId: ALEXEY,
      date,
      startTime: '14:00',
      now,
    });

    await createAppointment(repos, {
      user: { id: 21, first_name: 'Oleg' },
      serviceId: HAIRCUT,
      masterId: ROMAN,
      date,
      startTime: '14:00',
      now,
    });

    expect(getAvailableSlots(repos, HAIRCUT, ALEXEY, date, now)).not.toContain('14:00');
    expect(getAvailableSlots(repos, HAIRCUT, ROMAN, date, now)).not.toContain('14:00');

    await cancelAppointment(repos, created.id, 20);

    expect(getAvailableSlots(repos, HAIRCUT, ALEXEY, date, now)).toContain('14:00');
    expect(getAvailableSlots(repos, HAIRCUT, ROMAN, date, now)).not.toContain('14:00');
  });

  it('lists only Полина for a braiding-only service', () => {
    const masters = listMasters(repos, BRAIDING);
    expect(masters.map((m) => m.name)).toEqual(['Полина']);
    expect(masters.map((m) => m.id)).not.toContain(ALEXEY);
    expect(masters.map((m) => m.id)).not.toContain(ROMAN);
  });
});
