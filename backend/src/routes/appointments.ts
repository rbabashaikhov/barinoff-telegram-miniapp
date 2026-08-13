import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { repos } from '../container.js';
import { AppError, errorBody } from '../errors.js';
import { logger } from '../logger.js';
import { authMiddleware } from '../middleware/auth.js';
import { bookingRateLimit } from '../middleware/rateLimit.js';
import {
  BookingConflictError,
  cancelAppointment,
  createAppointment,
  getClientAppointments,
} from '../services/booking.js';
import { serializeAppointment } from './serialize.js';

export const appointmentsRouter = Router();

const createSchema = z.object({
  serviceId: z.number().int().positive(),
  masterId: z.number().int().positive(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
});

appointmentsRouter.post('/', authMiddleware, bookingRateLimit, async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: 'Invalid body',
      code: 'VALIDATION_ERROR',
      details: parsed.error.flatten(),
    });
    return;
  }

  try {
    const appointment = await createAppointment(repos, {
      user: req.auth!.telegramUser,
      serviceId: parsed.data.serviceId,
      masterId: parsed.data.masterId,
      date: parsed.data.date,
      startTime: parsed.data.startTime,
    });
    res.status(201).json({ data: serializeAppointment(appointment) });
  } catch (error) {
    if (error instanceof BookingConflictError || error instanceof AppError) {
      res.status(error.status).json(errorBody(error));
      return;
    }
    logger.error('Failed to create appointment', {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(400).json(errorBody(error));
  }
});

appointmentsRouter.get('/me', authMiddleware, (req, res) => {
  const includePast = req.query.includePast === 'true';
  const appointments = getClientAppointments(
    repos,
    req.auth!.telegramUser.id,
    includePast,
  );
  res.json({ data: appointments.map(serializeAppointment) });
});

async function handleCancel(req: Request, res: Response) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: 'Invalid appointment id', code: 'VALIDATION_ERROR' });
    return;
  }

  try {
    const appointment = await cancelAppointment(repos, id, req.auth!.telegramUser.id);
    res.json({ data: serializeAppointment(appointment) });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.status).json(errorBody(error));
      return;
    }
    logger.error('Failed to cancel appointment', {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(400).json(errorBody(error));
  }
}

appointmentsRouter.patch('/:id/cancel', authMiddleware, (req, res) => {
  void handleCancel(req, res);
});

appointmentsRouter.delete('/:id', authMiddleware, (req, res) => {
  void handleCancel(req, res);
});
