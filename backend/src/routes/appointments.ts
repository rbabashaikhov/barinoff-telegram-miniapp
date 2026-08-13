import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db/schema.js';
import { authMiddleware } from '../middleware/auth.js';
import {
  BookingConflictError,
  cancelAppointment,
  createAppointment,
  getClientAppointments,
} from '../services/booking.js';
import type { AppointmentWithDetails } from '../types.js';

export const appointmentsRouter = Router();

function serializeAppointment(a: AppointmentWithDetails) {
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
    },
  };
}

const createSchema = z.object({
  serviceId: z.number().int().positive(),
  masterId: z.number().int().positive(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
});

appointmentsRouter.post('/', authMiddleware, (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid body', details: parsed.error.flatten() });
    return;
  }

  try {
    const appointment = createAppointment(db, {
      user: req.auth!.telegramUser,
      serviceId: parsed.data.serviceId,
      masterId: parsed.data.masterId,
      date: parsed.data.date,
      startTime: parsed.data.startTime,
    });
    res.status(201).json({ data: serializeAppointment(appointment) });
  } catch (error) {
    if (error instanceof BookingConflictError) {
      res.status(409).json({ error: error.message });
      return;
    }
    const message = error instanceof Error ? error.message : 'Failed to create appointment';
    const status =
      message === 'Service not found' || message === 'Master not found' ? 404 : 400;
    res.status(status).json({ error: message });
  }
});

appointmentsRouter.get('/me', authMiddleware, (req, res) => {
  const includePast = req.query.includePast === 'true';
  const appointments = getClientAppointments(
    db,
    req.auth!.telegramUser.id,
    includePast,
  );
  res.json({ data: appointments.map(serializeAppointment) });
});

appointmentsRouter.patch('/:id/cancel', authMiddleware, (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: 'Invalid appointment id' });
    return;
  }

  try {
    const appointment = cancelAppointment(db, id, req.auth!.telegramUser.id);
    res.json({ data: serializeAppointment(appointment) });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to cancel';
    const status =
      message === 'Appointment not found'
        ? 404
        : message === 'Forbidden'
          ? 403
          : 400;
    res.status(status).json({ error: message });
  }
});

appointmentsRouter.delete('/:id', authMiddleware, (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: 'Invalid appointment id' });
    return;
  }

  try {
    const appointment = cancelAppointment(db, id, req.auth!.telegramUser.id);
    res.json({ data: serializeAppointment(appointment) });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to cancel';
    const status =
      message === 'Appointment not found'
        ? 404
        : message === 'Forbidden'
          ? 403
          : 400;
    res.status(status).json({ error: message });
  }
});
