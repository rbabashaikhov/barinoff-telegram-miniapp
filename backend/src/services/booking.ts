import { AppError } from '../errors.js';
import { eventBus } from '../events/bus.js';
import { logger } from '../logger.js';
import type { Repositories } from '../repositories/types.js';
import type {
  AppointmentWithDetails,
  Master,
  Service,
  TelegramUser,
} from '../types.js';
import {
  calculateAvailableSlots,
  currentTimeString,
  getWeekday,
  minutesToTime,
  rangesOverlap,
  timeToMinutes,
  todayDateString,
} from './slots.js';

export {
  SLOT_STEP_MINUTES,
  addDays,
  calculateAvailableSlots,
  currentTimeString,
  getWeekday,
  minutesToTime,
  rangesOverlap,
  timeToMinutes,
  todayDateString,
} from './slots.js';

export class BookingConflictError extends AppError {
  constructor(message = 'Selected time slot is no longer available') {
    super(message, 409, 'SLOT_UNAVAILABLE');
    this.name = 'BookingConflictError';
  }
}

function getBusyIntervals(repos: Repositories, date: string, masterId: number) {
  return [
    ...repos.appointments.listBusy(date, masterId),
    ...repos.blockedSlots.listBusy(date, masterId),
  ];
}

export function listMasters(repos: Repositories, serviceId?: number): Master[] {
  return repos.masters.listActive(serviceId);
}

export function getActiveService(repos: Repositories, serviceId: number): Service | undefined {
  return repos.services.getActiveById(serviceId);
}

export function getActiveMaster(repos: Repositories, masterId: number): Master | undefined {
  return repos.masters.getActiveById(masterId);
}

export function getAvailableSlots(
  repos: Repositories,
  serviceId: number,
  masterId: number,
  date: string,
  now = new Date(),
): string[] {
  const service = repos.services.getActiveById(serviceId);
  if (!service) {
    throw new AppError('Service not found', 404, 'SERVICE_NOT_FOUND');
  }
  const master = repos.masters.getActiveById(masterId);
  if (!master) {
    throw new AppError('Master not found', 404, 'MASTER_NOT_FOUND');
  }
  if (!repos.masters.offersService(masterId, serviceId)) {
    throw new AppError('Master does not offer this service', 400, 'SERVICE_NOT_OFFERED');
  }

  const workingHours = repos.workingHours.getForWeekday(masterId, getWeekday(date));
  const busyIntervals = getBusyIntervals(repos, date, masterId);

  return calculateAvailableSlots({
    date,
    durationMinutes: service.duration_minutes,
    workingHours,
    busyIntervals,
    now,
  });
}

export async function createAppointment(
  repos: Repositories,
  params: {
    user: TelegramUser;
    serviceId: number;
    masterId: number;
    date: string;
    startTime: string;
    now?: Date;
  },
): Promise<AppointmentWithDetails> {
  const now = params.now ?? new Date();

  let createdCustomer:
    | { clientId: number; user: TelegramUser }
    | undefined;

  const appointment = repos.transaction(() => {
    const service = repos.services.getActiveById(params.serviceId);
    if (!service) {
      throw new AppError('Service not found', 404, 'SERVICE_NOT_FOUND');
    }
    const master = repos.masters.getActiveById(params.masterId);
    if (!master) {
      throw new AppError('Master not found', 404, 'MASTER_NOT_FOUND');
    }
    if (!repos.masters.offersService(params.masterId, params.serviceId)) {
      throw new AppError('Master does not offer this service', 400, 'SERVICE_NOT_OFFERED');
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(params.date)) {
      throw new AppError('Invalid date format', 400, 'VALIDATION_ERROR');
    }
    if (!/^\d{2}:\d{2}$/.test(params.startTime)) {
      throw new AppError('Invalid time format', 400, 'VALIDATION_ERROR');
    }

    const endTime = minutesToTime(
      timeToMinutes(params.startTime) + service.duration_minutes,
    );

    const available = getAvailableSlots(
      repos,
      params.serviceId,
      params.masterId,
      params.date,
      now,
    );
    if (!available.includes(params.startTime)) {
      throw new BookingConflictError();
    }

    const start = timeToMinutes(params.startTime);
    const end = timeToMinutes(endTime);
    const busy = getBusyIntervals(repos, params.date, params.masterId);
    const conflict = busy.some((interval) =>
      rangesOverlap(
        start,
        end,
        timeToMinutes(interval.start_time),
        timeToMinutes(interval.end_time),
      ),
    );
    if (conflict) {
      throw new BookingConflictError();
    }

    const client = repos.clients.upsert(params.user);
    if (client.created) {
      createdCustomer = { clientId: client.id, user: params.user };
    }

    return repos.appointments.insert({
      clientId: client.id,
      serviceId: params.serviceId,
      masterId: params.masterId,
      date: params.date,
      startTime: params.startTime,
      endTime,
    });
  });

  logger.info('Booking created', {
    appointmentId: appointment.id,
    masterId: appointment.master_id,
    date: appointment.appointment_date,
    startTime: appointment.start_time,
  });

  if (createdCustomer) {
    await eventBus.emit({
      type: 'customer.created',
      payload: createdCustomer,
    });
  }

  await eventBus.emit({
    type: 'booking.created',
    payload: appointment,
  });

  return appointment;
}

export function getClientAppointments(
  repos: Repositories,
  telegramUserId: number,
  includePast = false,
): AppointmentWithDetails[] {
  return repos.appointments.listByTelegramUser(telegramUserId, {
    includePast,
    today: todayDateString(),
    nowTime: currentTimeString(),
  });
}

export async function cancelAppointment(
  repos: Repositories,
  appointmentId: number,
  telegramUserId: number,
): Promise<AppointmentWithDetails> {
  const appointment = repos.appointments.getById(appointmentId);
  if (!appointment) {
    throw new AppError('Appointment not found', 404, 'APPOINTMENT_NOT_FOUND');
  }
  if (appointment.client_telegram_user_id !== telegramUserId) {
    throw new AppError('Forbidden', 403, 'FORBIDDEN');
  }
  if (appointment.status === 'cancelled') {
    throw new AppError('Appointment already cancelled', 400, 'ALREADY_CANCELLED');
  }

  const cancelled = repos.appointments.cancel(appointmentId);

  logger.info('Booking cancelled', {
    appointmentId: cancelled.id,
    masterId: cancelled.master_id,
  });

  await eventBus.emit({
    type: 'booking.cancelled',
    payload: cancelled,
  });

  return cancelled;
}

export function getAdminAppointments(
  repos: Repositories,
  filters?: Parameters<Repositories['appointments']['listAdmin']>[0],
): AppointmentWithDetails[] {
  return repos.appointments.listAdmin(filters);
}
