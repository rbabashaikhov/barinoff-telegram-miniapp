import { Router } from 'express';
import { db } from '../db/schema.js';
import type { Service } from '../types.js';

export const servicesRouter = Router();

servicesRouter.get('/', (_req, res) => {
  const services = db
    .prepare(
      `
      SELECT id, name, description, duration_minutes, price, active
      FROM services
      WHERE active = 1
      ORDER BY id
    `,
    )
    .all() as Service[];

  res.json({
    data: services.map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      durationMinutes: s.duration_minutes,
      price: s.price,
      active: Boolean(s.active),
    })),
  });
});
