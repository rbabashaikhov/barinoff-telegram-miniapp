import type Database from 'better-sqlite3';
import type {
  AppointmentWithDetails,
  BlockedSlot,
  BusyInterval,
  Master,
  Service,
  TelegramUser,
  WorkingHours,
} from '../types.js';
import type {
  AppointmentListFilters,
  AppointmentsRepository,
  BlockedSlotsRepository,
  ClientsRepository,
  MastersRepository,
  Repositories,
  ServicesRepository,
  WorkingHoursRepository,
} from './types.js';

const APPOINTMENT_SELECT = `
  SELECT
    a.*,
    s.name AS service_name,
    s.price AS service_price,
    s.duration_minutes AS service_duration_minutes,
    m.name AS master_name,
    m.role AS master_role,
    c.telegram_user_id AS client_telegram_user_id,
    c.username AS client_username,
    c.first_name AS client_first_name,
    c.last_name AS client_last_name
  FROM appointments a
  JOIN services s ON s.id = a.service_id
  JOIN masters m ON m.id = a.master_id
  JOIN clients c ON c.id = a.client_id
`;

function createServicesRepo(db: Database.Database): ServicesRepository {
  return {
    listActive() {
      return db
        .prepare(
          `
          SELECT id, name, description, duration_minutes, price, active
          FROM services
          WHERE active = 1
          ORDER BY id
        `,
        )
        .all() as Service[];
    },
    listAll() {
      return db
        .prepare(
          `
          SELECT id, name, description, duration_minutes, price, active
          FROM services
          ORDER BY id
        `,
        )
        .all() as Service[];
    },
    getById(id: number) {
      return db.prepare('SELECT * FROM services WHERE id = ?').get(id) as Service | undefined;
    },
    getActiveById(id: number) {
      return db
        .prepare('SELECT * FROM services WHERE id = ? AND active = 1')
        .get(id) as Service | undefined;
    },
  };
}

function createMastersRepo(db: Database.Database): MastersRepository {
  return {
    listActive(serviceId?: number) {
      if (serviceId) {
        return db
          .prepare(
            `
            SELECT m.*
            FROM masters m
            JOIN master_services ms ON ms.master_id = m.id
            WHERE m.active = 1 AND ms.service_id = ?
            ORDER BY m.display_order, m.id
          `,
          )
          .all(serviceId) as Master[];
      }
      return db
        .prepare(
          `
          SELECT *
          FROM masters
          WHERE active = 1
          ORDER BY display_order, id
        `,
        )
        .all() as Master[];
    },
    listAll() {
      return db
        .prepare('SELECT * FROM masters ORDER BY display_order, id')
        .all() as Master[];
    },
    getById(id: number) {
      return db.prepare('SELECT * FROM masters WHERE id = ?').get(id) as Master | undefined;
    },
    getActiveById(id: number) {
      return db
        .prepare('SELECT * FROM masters WHERE id = ? AND active = 1')
        .get(id) as Master | undefined;
    },
    offersService(masterId: number, serviceId: number) {
      const row = db
        .prepare(
          `
          SELECT 1 AS ok
          FROM master_services
          WHERE master_id = ? AND service_id = ?
        `,
        )
        .get(masterId, serviceId) as { ok: number } | undefined;
      return Boolean(row);
    },
  };
}

function createClientsRepo(db: Database.Database): ClientsRepository {
  return {
    upsert(user: TelegramUser) {
      const existing = db
        .prepare('SELECT id FROM clients WHERE telegram_user_id = ?')
        .get(user.id) as { id: number } | undefined;

      if (existing) {
        db.prepare(
          `
          UPDATE clients
          SET username = ?, first_name = ?, last_name = ?
          WHERE id = ?
        `,
        ).run(user.username ?? null, user.first_name ?? null, user.last_name ?? null, existing.id);
        return { id: existing.id, created: false };
      }

      const result = db
        .prepare(
          `
          INSERT INTO clients (telegram_user_id, username, first_name, last_name)
          VALUES (?, ?, ?, ?)
        `,
        )
        .run(user.id, user.username ?? null, user.first_name ?? null, user.last_name ?? null);

      return { id: Number(result.lastInsertRowid), created: true };
    },
  };
}

function getAppointmentById(
  db: Database.Database,
  id: number,
): AppointmentWithDetails | undefined {
  return db.prepare(`${APPOINTMENT_SELECT} WHERE a.id = ?`).get(id) as
    | AppointmentWithDetails
    | undefined;
}

function createAppointmentsRepo(db: Database.Database): AppointmentsRepository {
  return {
    getById(id: number) {
      return getAppointmentById(db, id);
    },
    listByTelegramUser(telegramUserId, options) {
      if (!options.includePast) {
        return db
          .prepare(
            `
            ${APPOINTMENT_SELECT}
            WHERE c.telegram_user_id = ?
              AND a.status = 'confirmed'
              AND (
                a.appointment_date > ?
                OR (a.appointment_date = ? AND a.start_time >= ?)
              )
            ORDER BY a.appointment_date, a.start_time
          `,
          )
          .all(telegramUserId, options.today, options.today, options.nowTime) as AppointmentWithDetails[];
      }

      return db
        .prepare(
          `
          ${APPOINTMENT_SELECT}
          WHERE c.telegram_user_id = ?
          ORDER BY a.appointment_date DESC, a.start_time DESC
        `,
        )
        .all(telegramUserId) as AppointmentWithDetails[];
    },
    listAdmin(filters: AppointmentListFilters = {}) {
      const clauses: string[] = [];
      const params: Array<string | number> = [];

      if (filters.status) {
        clauses.push('a.status = ?');
        params.push(filters.status);
      }
      if (filters.masterId) {
        clauses.push('a.master_id = ?');
        params.push(filters.masterId);
      }
      if (filters.dateFrom) {
        clauses.push('a.appointment_date >= ?');
        params.push(filters.dateFrom);
      }
      if (filters.dateTo) {
        clauses.push('a.appointment_date <= ?');
        params.push(filters.dateTo);
      }

      const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
      return db
        .prepare(
          `
          ${APPOINTMENT_SELECT}
          ${where}
          ORDER BY a.appointment_date DESC, a.start_time DESC
        `,
        )
        .all(...params) as AppointmentWithDetails[];
    },
    listBusy(date: string, masterId: number) {
      return db
        .prepare(
          `
          SELECT start_time, end_time
          FROM appointments
          WHERE appointment_date = ? AND master_id = ? AND status = 'confirmed'
        `,
        )
        .all(date, masterId) as BusyInterval[];
    },
    insert(params) {
      const result = db
        .prepare(
          `
          INSERT INTO appointments (
            client_id, service_id, master_id, appointment_date, start_time, end_time, status
          ) VALUES (?, ?, ?, ?, ?, ?, 'confirmed')
        `,
        )
        .run(
          params.clientId,
          params.serviceId,
          params.masterId,
          params.date,
          params.startTime,
          params.endTime,
        );
      return getAppointmentById(db, Number(result.lastInsertRowid))!;
    },
    cancel(id: number) {
      db.prepare(`UPDATE appointments SET status = 'cancelled' WHERE id = ?`).run(id);
      return getAppointmentById(db, id)!;
    },
  };
}

function createWorkingHoursRepo(db: Database.Database): WorkingHoursRepository {
  return {
    listAll() {
      return db
        .prepare('SELECT * FROM working_hours ORDER BY master_id, weekday')
        .all() as WorkingHours[];
    },
    listByMaster(masterId: number) {
      return db
        .prepare('SELECT * FROM working_hours WHERE master_id = ? ORDER BY weekday')
        .all(masterId) as WorkingHours[];
    },
    getForWeekday(masterId: number, weekday: number) {
      const row = db
        .prepare('SELECT * FROM working_hours WHERE master_id = ? AND weekday = ?')
        .get(masterId, weekday) as WorkingHours | undefined;
      return row ?? null;
    },
  };
}

function createBlockedSlotsRepo(db: Database.Database): BlockedSlotsRepository {
  return {
    list(filters = {}) {
      const clauses: string[] = [];
      const params: Array<string | number> = [];
      if (filters.masterId) {
        clauses.push('master_id = ?');
        params.push(filters.masterId);
      }
      if (filters.date) {
        clauses.push('blocked_date = ?');
        params.push(filters.date);
      }
      const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
      return db
        .prepare(
          `
          SELECT * FROM blocked_slots
          ${where}
          ORDER BY blocked_date DESC, start_time
        `,
        )
        .all(...params) as BlockedSlot[];
    },
    listBusy(date: string, masterId: number) {
      return db
        .prepare(
          `
          SELECT start_time, end_time
          FROM blocked_slots
          WHERE blocked_date = ? AND master_id = ?
        `,
        )
        .all(date, masterId) as BusyInterval[];
    },
    create(params) {
      const result = db
        .prepare(
          `
          INSERT INTO blocked_slots (master_id, blocked_date, start_time, end_time, reason)
          VALUES (?, ?, ?, ?, ?)
        `,
        )
        .run(
          params.masterId,
          params.date,
          params.startTime,
          params.endTime,
          params.reason ?? null,
        );
      return db
        .prepare('SELECT * FROM blocked_slots WHERE id = ?')
        .get(Number(result.lastInsertRowid)) as BlockedSlot;
    },
    delete(id: number) {
      const result = db.prepare('DELETE FROM blocked_slots WHERE id = ?').run(id);
      return result.changes > 0;
    },
  };
}

export function createSqliteRepositories(db: Database.Database): Repositories {
  return {
    services: createServicesRepo(db),
    masters: createMastersRepo(db),
    clients: createClientsRepo(db),
    appointments: createAppointmentsRepo(db),
    workingHours: createWorkingHoursRepo(db),
    blockedSlots: createBlockedSlotsRepo(db),
    transaction<T>(fn: () => T): T {
      return db.transaction(fn)();
    },
  };
}
