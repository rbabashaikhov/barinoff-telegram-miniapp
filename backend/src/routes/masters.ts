import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db/schema.js';
import { getActiveService, listMasters } from '../services/booking.js';
import type { Master } from '../types.js';

export const mastersRouter = Router();

function serializeMaster(master: Master) {
  return {
    id: master.id,
    name: master.name,
    role: master.role,
    description: master.description,
    active: Boolean(master.active),
    displayOrder: master.display_order,
  };
}

const querySchema = z.object({
  serviceId: z.coerce.number().int().positive().optional(),
});

mastersRouter.get('/', (req, res) => {
  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid query', details: parsed.error.flatten() });
    return;
  }

  const { serviceId } = parsed.data;
  if (serviceId && !getActiveService(db, serviceId)) {
    res.status(404).json({ error: 'Service not found' });
    return;
  }

  res.json({ data: listMasters(db, serviceId).map(serializeMaster) });
});
