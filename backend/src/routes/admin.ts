import { Router } from 'express';
import { db } from '../db/schema.js';
import { getAdminAppointments } from '../services/booking.js';

export const adminRouter = Router();

adminRouter.get('/appointments', (_req, res) => {
  const appointments = getAdminAppointments(db);

  res.json({
    data: appointments.map((a) => ({
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
      client: {
        name: [a.client_first_name, a.client_last_name].filter(Boolean).join(' ') || '—',
        telegramUserId: a.client_telegram_user_id,
        username: a.client_username,
        firstName: a.client_first_name,
        lastName: a.client_last_name,
      },
    })),
  });
});
