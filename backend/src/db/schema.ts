import path from 'node:path';
import fs from 'node:fs';
import Database from 'better-sqlite3';

const databasePath =
  process.env.DATABASE_PATH ||
  path.join(process.cwd(), 'data', 'booking.db');

const dir = path.dirname(databasePath);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

export const db: Database.Database = new Database(databasePath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function tableExists(database: Database.Database, name: string): boolean {
  const row = database
    .prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?`)
    .get(name) as { name: string } | undefined;
  return Boolean(row);
}

function columnNames(database: Database.Database, table: string): string[] {
  return (
    database.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>
  ).map((col) => col.name);
}

function hasColumn(database: Database.Database, table: string, column: string): boolean {
  return columnNames(database, table).includes(column);
}

export function applySchema(database: Database.Database): void {
  database.pragma('foreign_keys = ON');

  database.exec(`
    CREATE TABLE IF NOT EXISTS services (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      duration_minutes INTEGER NOT NULL,
      price INTEGER NOT NULL,
      active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      telegram_user_id INTEGER NOT NULL UNIQUE,
      username TEXT,
      first_name TEXT,
      last_name TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS masters (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      active INTEGER NOT NULL DEFAULT 1,
      display_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS master_services (
      master_id INTEGER NOT NULL,
      service_id INTEGER NOT NULL,
      PRIMARY KEY (master_id, service_id),
      FOREIGN KEY (master_id) REFERENCES masters(id),
      FOREIGN KEY (service_id) REFERENCES services(id)
    );
  `);

  if (!tableExists(database, 'appointments')) {
    database.exec(`
      CREATE TABLE appointments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id INTEGER NOT NULL,
        service_id INTEGER NOT NULL,
        master_id INTEGER NOT NULL,
        appointment_date TEXT NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'confirmed'
          CHECK (status IN ('confirmed', 'cancelled')),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (client_id) REFERENCES clients(id),
        FOREIGN KEY (service_id) REFERENCES services(id),
        FOREIGN KEY (master_id) REFERENCES masters(id)
      );
    `);
  } else if (!hasColumn(database, 'appointments', 'master_id')) {
    database.exec(`ALTER TABLE appointments ADD COLUMN master_id INTEGER`);
  }

  if (!tableExists(database, 'working_hours')) {
    database.exec(`
      CREATE TABLE working_hours (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        master_id INTEGER NOT NULL,
        weekday INTEGER NOT NULL CHECK (weekday BETWEEN 0 AND 6),
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        active INTEGER NOT NULL DEFAULT 1,
        UNIQUE (master_id, weekday),
        FOREIGN KEY (master_id) REFERENCES masters(id)
      );
    `);
  } else if (!hasColumn(database, 'working_hours', 'master_id')) {
    database.exec(`
      ALTER TABLE working_hours RENAME TO working_hours_legacy;
      CREATE TABLE working_hours (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        master_id INTEGER NOT NULL,
        weekday INTEGER NOT NULL CHECK (weekday BETWEEN 0 AND 6),
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        active INTEGER NOT NULL DEFAULT 1,
        UNIQUE (master_id, weekday),
        FOREIGN KEY (master_id) REFERENCES masters(id)
      );
      DROP TABLE working_hours_legacy;
    `);
  }

  if (!tableExists(database, 'blocked_slots')) {
    database.exec(`
      CREATE TABLE blocked_slots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        master_id INTEGER NOT NULL,
        blocked_date TEXT NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        reason TEXT,
        FOREIGN KEY (master_id) REFERENCES masters(id)
      );
    `);
  } else if (!hasColumn(database, 'blocked_slots', 'master_id')) {
    database.exec(`ALTER TABLE blocked_slots ADD COLUMN master_id INTEGER`);
  }

  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_appointments_date_status
      ON appointments (appointment_date, status);
    CREATE INDEX IF NOT EXISTS idx_appointments_client
      ON appointments (client_id);
    CREATE INDEX IF NOT EXISTS idx_appointments_master_date
      ON appointments (master_id, appointment_date, status);
    CREATE INDEX IF NOT EXISTS idx_working_hours_master
      ON working_hours (master_id, weekday);
    CREATE INDEX IF NOT EXISTS idx_blocked_slots_master
      ON blocked_slots (master_id, blocked_date);
  `);
}

export function migrate(): void {
  applySchema(db);
}
