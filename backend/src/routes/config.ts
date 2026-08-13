import { Router } from 'express';
import { publicAppConfig } from '../config.js';

export const configRouter = Router();

configRouter.get('/', (_req, res) => {
  res.json({ data: publicAppConfig() });
});
