import { Router } from 'express';
import { z } from 'zod';
import { isDemoAdminPreviewEnabled } from '../config.js';
import { repos } from '../container.js';
import type { Repositories } from '../repositories/types.js';
import { getAdminAppointments } from '../services/booking.js';
import {
  serializeAppointment,
  serializeBlockedSlot,
  serializeMaster,
  serializeService,
  serializeWorkingHours,
} from './serialize.js';

const appointmentQuery = z.object({
  status: z.enum(['confirmed', 'cancelled']).optional(),
  masterId: z.coerce.number().int().positive().optional(),
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

const blockedQuery = z.object({
  masterId: z.coerce.number().int().positive().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export function createDemoAdminRouter(
  repositories: Repositories,
  options?: { isEnabled?: () => boolean },
): Router {
  const router = Router();
  const isEnabled = options?.isEnabled ?? (() => isDemoAdminPreviewEnabled());

  router.use((req, res, next) => {
    if (!isEnabled()) {
      res.status(404).json({ error: 'Not found', code: 'NOT_FOUND' });
      return;
    }
    if (req.method !== 'GET') {
      res.status(405).json({
        error: 'Demo admin is read-only',
        code: 'DEMO_ADMIN_READ_ONLY',
      });
      return;
    }
    next();
  });

  router.get('/appointments', (req, res) => {
    const parsed = appointmentQuery.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({
        error: 'Invalid query',
        code: 'VALIDATION_ERROR',
        details: parsed.error.flatten(),
      });
      return;
    }
    res.json({
      data: getAdminAppointments(repositories, parsed.data).map(serializeAppointment),
    });
  });

  router.get('/services', (_req, res) => {
    res.json({ data: repositories.services.listAll().map(serializeService) });
  });

  router.get('/masters', (_req, res) => {
    res.json({
      data: repositories.masters.listAll().map((master) =>
        serializeMaster(master, repositories.masters.listServiceIds(master.id)),
      ),
    });
  });

  router.get('/working-hours', (req, res) => {
    const masterId = req.query.masterId ? Number(req.query.masterId) : undefined;
    if (masterId !== undefined && (!Number.isInteger(masterId) || masterId <= 0)) {
      res.status(400).json({ error: 'Invalid masterId', code: 'VALIDATION_ERROR' });
      return;
    }
    const rows = masterId
      ? repositories.workingHours.listByMaster(masterId)
      : repositories.workingHours.listAll();
    res.json({ data: rows.map(serializeWorkingHours) });
  });

  router.get('/blocked-slots', (req, res) => {
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
      data: repositories.blockedSlots.list(parsed.data).map(serializeBlockedSlot),
    });
  });

  router.all('*', (_req, res) => {
    res.status(404).json({ error: 'Not found', code: 'NOT_FOUND' });
  });

  return router;
}

export const demoAdminRouter = createDemoAdminRouter(repos);
