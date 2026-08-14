import type { AppointmentWithDetails, BlockedSlot, Master, Service, WorkingHours } from '../types.js';

export function serializeAppointment(a: AppointmentWithDetails) {
  return {
    id: a.id,
    date: a.appointment_date,
    startTime: a.start_time,
    endTime: a.end_time,
    status: a.status,
    createdAt: a.created_at,
    service: {
      id: a.service_id,
      name: a.service_name,
      price: a.service_price,
      durationMinutes: a.service_duration_minutes,
    },
    master: {
      id: a.master_id,
      name: a.master_name,
      role: a.master_role,
    },
    client: {
      telegramUserId: a.client_telegram_user_id,
      username: a.client_username,
      firstName: a.client_first_name,
      lastName: a.client_last_name,
      name: [a.client_first_name, a.client_last_name].filter(Boolean).join(' ') || '—',
    },
  };
}

export function serializeService(service: Service) {
  return {
    id: service.id,
    name: service.name,
    description: service.description,
    durationMinutes: service.duration_minutes,
    price: service.price,
    active: Boolean(service.active),
  };
}

export function serializeMaster(master: Master, serviceIds?: number[]) {
  return {
    id: master.id,
    name: master.name,
    role: master.role,
    description: master.description,
    active: Boolean(master.active),
    displayOrder: master.display_order,
    ...(serviceIds ? { serviceIds } : {}),
  };
}

export function serializeWorkingHours(row: WorkingHours) {
  return {
    id: row.id,
    masterId: row.master_id,
    weekday: row.weekday,
    startTime: row.start_time,
    endTime: row.end_time,
    active: Boolean(row.active),
  };
}

export function serializeBlockedSlot(row: BlockedSlot) {
  return {
    id: row.id,
    masterId: row.master_id,
    date: row.blocked_date,
    startTime: row.start_time,
    endTime: row.end_time,
    reason: row.reason,
  };
}
