import Database from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { seed } from '../db/index.js';
import {
  BookingConflictError,
  cancelAppointment,
  createAppointment,
  getAvailableSlots,
} from './booking.js';

function setupDb(): Database.Database {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  db.exec(`
    CREATE TABLE services (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      duration_minutes INTEGER NOT NULL,
      price INTEGER NOT NULL,
      active INTEGER NOT NULL DEFAULT 1
    );
    CREATE TABLE clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      telegram_user_id INTEGER NOT NULL UNIQUE,
      username TEXT,
      first_name TEXT,
      last_name TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE appointments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL,
      service_id INTEGER NOT NULL,
      appointment_date TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'confirmed'
        CHECK (status IN ('confirmed', 'cancelled')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (client_id) REFERENCES clients(id),
      FOREIGN KEY (service_id) REFERENCES services(id)
    );
    CREATE TABLE working_hours (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      weekday INTEGER NOT NULL CHECK (weekday BETWEEN 0 AND 6),
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1,
      UNIQUE (weekday)
    );
    CREATE TABLE blocked_slots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      blocked_date TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      reason TEXT
    );
  `);
  seed(db);
  return db;
}

describe('booking persistence', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = setupDb();
  });

  afterEach(() => {
    db.close();
  });

  it('creates appointment and removes slot from availability', () => {
    const date = '2026-08-17'; // Monday
    const now = new Date(2026, 7, 12, 9, 0, 0);

    const before = getAvailableSlots(db, 1, date, now);
    expect(before).toContain('10:00');

    const created = createAppointment(db, {
      user: { id: 111, username: 'client1', first_name: 'Ivan' },
      serviceId: 1,
      date,
      startTime: '10:00',
      now,
    });

    expect(created.status).toBe('confirmed');
    expect(created.start_time).toBe('10:00');
    expect(created.end_time).toBe('11:00');

    const after = getAvailableSlots(db, 1, date, now);
    expect(after).not.toContain('10:00');
  });

  it('rejects overlapping double booking', () => {
    const date = '2026-08-17';
    const now = new Date(2026, 7, 12, 9, 0, 0);

    createAppointment(db, {
      user: { id: 111, username: 'client1', first_name: 'Ivan' },
      serviceId: 1,
      date,
      startTime: '12:00',
      now,
    });

    expect(() =>
      createAppointment(db, {
        user: { id: 222, username: 'client2', first_name: 'Petr' },
        serviceId: 1,
        date,
        startTime: '12:00',
        now,
      }),
    ).toThrow(BookingConflictError);

    expect(() =>
      createAppointment(db, {
        user: { id: 333, username: 'client3', first_name: 'Oleg' },
        serviceId: 2,
        date,
        startTime: '11:00',
        now,
      }),
    ).toThrow(BookingConflictError);
  });

  it('restores availability after cancellation', () => {
    const date = '2026-08-18'; // Tuesday
    const now = new Date(2026, 7, 12, 9, 0, 0);

    const created = createAppointment(db, {
      user: { id: 444, username: 'client4', first_name: 'Anna' },
      serviceId: 3,
      date,
      startTime: '15:00',
      now,
    });

    expect(getAvailableSlots(db, 3, date, now)).not.toContain('15:00');

    cancelAppointment(db, created.id, 444);

    expect(getAvailableSlots(db, 3, date, now)).toContain('15:00');
  });
});
