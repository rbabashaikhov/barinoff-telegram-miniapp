import { Router } from 'express';
import { z } from 'zod';
import { repos } from '../container.js';
import { getActiveService, listMasters } from '../services/booking.js';
import { serializeMaster } from './serialize.js';

export const mastersRouter = Router();

const querySchema = z.object({
  serviceId: z.coerce.number().int().positive().optional(),
});

mastersRouter.get('/', (req, res) => {
  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({
      error: 'Invalid query',
      code: 'VALIDATION_ERROR',
      details: parsed.error.flatten(),
    });
    return;
  }

  const { serviceId } = parsed.data;
  if (serviceId && !getActiveService(repos, serviceId)) {
    res.status(404).json({ error: 'Service not found', code: 'SERVICE_NOT_FOUND' });
    return;
  }

  res.json({ data: listMasters(repos, serviceId).map(serializeMaster) });
});
