import type Database from 'better-sqlite3';
import type {
  AppointmentWithDetails,
  Service,
  TelegramUser,
  WorkingHours,
} from '../types.js';

export const SLOT_STEP_MINUTES = 15;

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

export function minutesToTime(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function rangesOverlap(
  startA: number,
  endA: number,
  startB: number,
  endB: number,
): boolean {
  return startA < endB && startB < endA;
}

export function getWeekday(dateStr: string): number {
  // Parse as local calendar date (YYYY-MM-DD)
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).getDay();
}

export function todayDateString(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function currentTimeString(now = new Date()): string {
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

export function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  return todayDateString(date);
}

export interface BusyInterval {
  start_time: string;
  end_time: string;
}

/**
 * Pure availability calculator — used by API and unit tests.
 */
export function calculateAvailableSlots(params: {
  date: string;
  durationMinutes: number;
  workingHours: WorkingHours | null;
  busyIntervals: BusyInterval[];
  now?: Date;
  stepMinutes?: number;
}): string[] {
  const {
    date,
    durationMinutes,
    workingHours,
    busyIntervals,
    now = new Date(),
    stepMinutes = SLOT_STEP_MINUTES,
  } = params;

  if (!workingHours || !workingHours.active) {
    return [];
  }

  const workStart = timeToMinutes(workingHours.start_time);
  const workEnd = timeToMinutes(workingHours.end_time);
  if (workEnd - workStart < durationMinutes) {
    return [];
  }

  const busy = busyIntervals.map((interval) => ({
    start: timeToMinutes(interval.start_time),
    end: timeToMinutes(interval.end_time),
  }));

  const today = todayDateString(now);
  const nowMinutes = timeToMinutes(currentTimeString(now));

  const slots: string[] = [];

  for (let start = workStart; start + durationMinutes <= workEnd; start += stepMinutes) {
    const end = start + durationMinutes;

    if (date < today) {
      continue;
    }
    if (date === today && start <= nowMinutes) {
      continue;
    }

    const overlaps = busy.some((b) => rangesOverlap(start, end, b.start, b.end));
    if (!overlaps) {
      slots.push(minutesToTime(start));
    }
  }

  return slots;
}

export function upsertClient(db: Database.Database, user: TelegramUser): number {
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
    return existing.id;
  }

  const result = db
    .prepare(
      `
      INSERT INTO clients (telegram_user_id, username, first_name, last_name)
      VALUES (?, ?, ?, ?)
    `,
    )
    .run(user.id, user.username ?? null, user.first_name ?? null, user.last_name ?? null);

  return Number(result.lastInsertRowid);
}

export function getActiveService(
  db: Database.Database,
  serviceId: number,
): Service | undefined {
  return db
    .prepare('SELECT * FROM services WHERE id = ? AND active = 1')
    .get(serviceId) as Service | undefined;
}

export function getWorkingHoursForDate(
  db: Database.Database,
  date: string,
): WorkingHours | null {
  const weekday = getWeekday(date);
  const row = db
    .prepare('SELECT * FROM working_hours WHERE weekday = ?')
    .get(weekday) as WorkingHours | undefined;
  return row ?? null;
}

export function getBusyIntervals(db: Database.Database, date: string): BusyInterval[] {
  const appointments = db
    .prepare(
      `
      SELECT start_time, end_time
      FROM appointments
      WHERE appointment_date = ? AND status = 'confirmed'
    `,
    )
    .all(date) as BusyInterval[];

  const blocked = db
    .prepare(
      `
      SELECT start_time, end_time
      FROM blocked_slots
      WHERE blocked_date = ?
    `,
    )
    .all(date) as BusyInterval[];

  return [...appointments, ...blocked];
}

export function getAvailableSlots(
  db: Database.Database,
  serviceId: number,
  date: string,
  now = new Date(),
): string[] {
  const service = getActiveService(db, serviceId);
  if (!service) {
    throw new Error('Service not found');
  }

  const workingHours = getWorkingHoursForDate(db, date);
  const busyIntervals = getBusyIntervals(db, date);

  return calculateAvailableSlots({
    date,
    durationMinutes: service.duration_minutes,
    workingHours,
    busyIntervals,
    now,
  });
}

export class BookingConflictError extends Error {
  constructor(message = 'Selected time slot is no longer available') {
    super(message);
    this.name = 'BookingConflictError';
  }
}

export function createAppointment(
  db: Database.Database,
  params: {
    user: TelegramUser;
    serviceId: number;
    date: string;
    startTime: string;
    now?: Date;
  },
): AppointmentWithDetails {
  const now = params.now ?? new Date();
  const service = getActiveService(db, params.serviceId);
  if (!service) {
    throw new Error('Service not found');
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(params.date)) {
    throw new Error('Invalid date format');
  }
  if (!/^\d{2}:\d{2}$/.test(params.startTime)) {
    throw new Error('Invalid time format');
  }

  const endTime = minutesToTime(
    timeToMinutes(params.startTime) + service.duration_minutes,
  );

  const createTx = db.transaction(() => {
    const available = getAvailableSlots(db, params.serviceId, params.date, now);
    if (!available.includes(params.startTime)) {
      throw new BookingConflictError();
    }

    // Extra overlap guard inside transaction against race conditions
    const start = timeToMinutes(params.startTime);
    const end = timeToMinutes(endTime);
    const busy = getBusyIntervals(db, params.date);
    const conflict = busy.some((interval) =>
      rangesOverlap(start, end, timeToMinutes(interval.start_time), timeToMinutes(interval.end_time)),
    );
    if (conflict) {
      throw new BookingConflictError();
    }

    const clientId = upsertClient(db, params.user);

    const result = db
      .prepare(
        `
        INSERT INTO appointments (
          client_id, service_id, appointment_date, start_time, end_time, status
        ) VALUES (?, ?, ?, ?, ?, 'confirmed')
      `,
      )
      .run(clientId, params.serviceId, params.date, params.startTime, endTime);

    return getAppointmentById(db, Number(result.lastInsertRowid))!;
  });

  return createTx();
}

const APPOINTMENT_SELECT = `
  SELECT
    a.*,
    s.name AS service_name,
    s.price AS service_price,
    s.duration_minutes AS service_duration_minutes,
    c.telegram_user_id AS client_telegram_user_id,
    c.username AS client_username,
    c.first_name AS client_first_name,
    c.last_name AS client_last_name
  FROM appointments a
  JOIN services s ON s.id = a.service_id
  JOIN clients c ON c.id = a.client_id
`;

export function getAppointmentById(
  db: Database.Database,
  id: number,
): AppointmentWithDetails | undefined {
  return db.prepare(`${APPOINTMENT_SELECT} WHERE a.id = ?`).get(id) as
    | AppointmentWithDetails
    | undefined;
}

export function getClientAppointments(
  db: Database.Database,
  telegramUserId: number,
  includePast = false,
): AppointmentWithDetails[] {
  const today = todayDateString();
  const nowTime = currentTimeString();

  let sql = `
    ${APPOINTMENT_SELECT}
    WHERE c.telegram_user_id = ?
  `;

  if (!includePast) {
    sql += `
      AND a.status = 'confirmed'
      AND (
        a.appointment_date > ?
        OR (a.appointment_date = ? AND a.start_time >= ?)
      )
    `;
    return db.prepare(`${sql} ORDER BY a.appointment_date, a.start_time`).all(
      telegramUserId,
      today,
      today,
      nowTime,
    ) as AppointmentWithDetails[];
  }

  return db
    .prepare(`${sql} ORDER BY a.appointment_date DESC, a.start_time DESC`)
    .all(telegramUserId) as AppointmentWithDetails[];
}

export function cancelAppointment(
  db: Database.Database,
  appointmentId: number,
  telegramUserId: number,
): AppointmentWithDetails {
  const appointment = getAppointmentById(db, appointmentId);
  if (!appointment) {
    throw new Error('Appointment not found');
  }
  if (appointment.client_telegram_user_id !== telegramUserId) {
    throw new Error('Forbidden');
  }
  if (appointment.status === 'cancelled') {
    throw new Error('Appointment already cancelled');
  }

  db.prepare(`UPDATE appointments SET status = 'cancelled' WHERE id = ?`).run(
    appointmentId,
  );

  return getAppointmentById(db, appointmentId)!;
}

export function getAdminAppointments(
  db: Database.Database,
): AppointmentWithDetails[] {
  return db
    .prepare(
      `
      ${APPOINTMENT_SELECT}
      ORDER BY a.appointment_date DESC, a.start_time DESC
    `,
    )
    .all() as AppointmentWithDetails[];
}
