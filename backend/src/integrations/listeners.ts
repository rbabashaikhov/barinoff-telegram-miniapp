import { logger } from '../logger.js';
import type { EventBus } from '../events/bus.js';
import type { AppointmentWithDetails } from '../types.js';
import type { CrmAdapter, CrmBookingInput, CrmCustomerInput } from './crm/types.js';

function toCustomer(appointment: AppointmentWithDetails): CrmCustomerInput {
  return {
    telegramUserId: appointment.client_telegram_user_id,
    username: appointment.client_username,
    firstName: appointment.client_first_name,
    lastName: appointment.client_last_name,
    localClientId: appointment.client_id,
  };
}

function toBooking(appointment: AppointmentWithDetails): CrmBookingInput {
  return {
    localAppointmentId: appointment.id,
    status: appointment.status,
    date: appointment.appointment_date,
    startTime: appointment.start_time,
    endTime: appointment.end_time,
    createdAt: appointment.created_at,
    service: {
      id: appointment.service_id,
      name: appointment.service_name,
      price: appointment.service_price,
      durationMinutes: appointment.service_duration_minutes,
    },
    master: {
      id: appointment.master_id,
      name: appointment.master_name,
      role: appointment.master_role,
    },
    customer: toCustomer(appointment),
  };
}

async function runSafe(
  label: string,
  fn: () => Promise<{ ok: boolean; error?: string }>,
): Promise<void> {
  try {
    const result = await fn();
    if (!result.ok) {
      logger.error(`CRM ${label} failed`, { error: result.error });
    }
  } catch (error) {
    logger.error(`CRM ${label} threw`, {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export function registerCrmListeners(bus: EventBus, adapter: CrmAdapter): void {
  bus.on('customer.created', async (event) => {
    await runSafe('createOrUpdateCustomer', () =>
      adapter.createOrUpdateCustomer({
        telegramUserId: event.payload.user.id,
        username: event.payload.user.username ?? null,
        firstName: event.payload.user.first_name ?? null,
        lastName: event.payload.user.last_name ?? null,
        localClientId: event.payload.clientId,
      }),
    );
  });

  bus.on('booking.created', async (event) => {
    const booking = toBooking(event.payload);
    await runSafe('createOrUpdateCustomer', () => adapter.createOrUpdateCustomer(booking.customer));
    await runSafe('createBooking', () => adapter.createBooking(booking));
  });

  bus.on('booking.updated', async (event) => {
    await runSafe('updateBooking', () => adapter.updateBooking(toBooking(event.payload)));
  });

  bus.on('booking.cancelled', async (event) => {
    await runSafe('cancelBooking', () => adapter.cancelBooking(toBooking(event.payload)));
  });
}
