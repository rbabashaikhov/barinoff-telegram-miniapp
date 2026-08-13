import { Router } from 'express';
import { repos } from '../container.js';
import { serializeService } from './serialize.js';

export const servicesRouter = Router();

servicesRouter.get('/', (_req, res) => {
  res.json({ data: repos.services.listActive().map(serializeService) });
});
