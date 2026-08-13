import { Router } from 'express';
import { z } from 'zod';
import { repos } from '../container.js';
import { adminAuthMiddleware } from '../middleware/adminAuth.js';
import { getAdminAppointments } from '../services/booking.js';
import {
  serializeAppointment,
  serializeBlockedSlot,
  serializeMaster,
  serializeService,
  serializeWorkingHours,
} from './serialize.js';

export const adminRouter = Router();

adminRouter.use(adminAuthMiddleware);

const appointmentQuery = z.object({
  status: z.enum(['confirmed', 'cancelled']).optional(),
  masterId: z.coerce.number().int().positive().optional(),
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

adminRouter.get('/appointments', (req, res) => {
  const parsed = appointmentQuery.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({
      error: 'Invalid query',
      code: 'VALIDATION_ERROR',
      details: parsed.error.flatten(),
    });
    return;
  }

  const appointments = getAdminAppointments(repos, parsed.data);
  res.json({ data: appointments.map(serializeAppointment) });
});

adminRouter.get('/services', (_req, res) => {
  res.json({ data: repos.services.listAll().map(serializeService) });
});

adminRouter.get('/masters', (_req, res) => {
  res.json({ data: repos.masters.listAll().map(serializeMaster) });
});

adminRouter.get('/working-hours', (req, res) => {
  const masterId = req.query.masterId ? Number(req.query.masterId) : undefined;
  if (masterId !== undefined && (!Number.isInteger(masterId) || masterId <= 0)) {
    res.status(400).json({ error: 'Invalid masterId', code: 'VALIDATION_ERROR' });
    return;
  }
  const rows = masterId
    ? repos.workingHours.listByMaster(masterId)
    : repos.workingHours.listAll();
  res.json({ data: rows.map(serializeWorkingHours) });
});

const blockedQuery = z.object({
  masterId: z.coerce.number().int().positive().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

adminRouter.get('/blocked-slots', (req, res) => {
  const parsed = blockedQuery.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({
      error: 'Invalid query',
      code: 'VALIDATION_ERROR',
      details: parsed.error.flatten(),
    });
    return;
  }
  res.json({
    data: repos.blockedSlots.list(parsed.data).map(serializeBlockedSlot),
  });
});

const createBlockedSchema = z.object({
  masterId: z.number().int().positive(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  reason: z.string().max(200).optional().nullable(),
});

adminRouter.post('/blocked-slots', (req, res) => {
  const parsed = createBlockedSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: 'Invalid body',
      code: 'VALIDATION_ERROR',
      details: parsed.error.flatten(),
    });
    return;
  }

  if (!repos.masters.getById(parsed.data.masterId)) {
    res.status(404).json({ error: 'Master not found', code: 'MASTER_NOT_FOUND' });
    return;
  }

  const created = repos.blockedSlots.create({
    masterId: parsed.data.masterId,
    date: parsed.data.date,
    startTime: parsed.data.startTime,
    endTime: parsed.data.endTime,
    reason: parsed.data.reason,
  });
  res.status(201).json({ data: serializeBlockedSlot(created) });
});

adminRouter.delete('/blocked-slots/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: 'Invalid id', code: 'VALIDATION_ERROR' });
    return;
  }
  const deleted = repos.blockedSlots.delete(id);
  if (!deleted) {
    res.status(404).json({ error: 'Blocked slot not found', code: 'NOT_FOUND' });
    return;
  }
  res.status(204).send();
});
