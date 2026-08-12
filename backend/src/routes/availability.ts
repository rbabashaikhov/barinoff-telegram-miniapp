import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db/schema.js';
import {
  addDays,
  getAvailableSlots,
  getWeekday,
  todayDateString,
} from '../services/booking.js';

export const availabilityRouter = Router();

const querySchema = z.object({
  serviceId: z.coerce.number().int().positive(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  days: z.coerce.number().int().min(1).max(30).optional().default(14),
});

availabilityRouter.get('/', (req, res) => {
  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid query', details: parsed.error.flatten() });
    return;
  }

  const { serviceId, date, days } = parsed.data;

  try {
    if (date) {
      const slots = getAvailableSlots(db, serviceId, date);
      res.json({
        data: {
          serviceId,
          date,
          weekday: getWeekday(date),
          slots,
        },
      });
      return;
    }

    const start = todayDateString();
    const calendar = [];
    for (let i = 0; i < days; i += 1) {
      const d = addDays(start, i);
      const slots = getAvailableSlots(db, serviceId, d);
      calendar.push({
        date: d,
        weekday: getWeekday(d),
        slots,
        available: slots.length > 0,
      });
    }

    res.json({
      data: {
        serviceId,
        days,
        calendar,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get availability';
    const status = message === 'Service not found' ? 404 : 500;
    res.status(status).json({ error: message });
  }
});
