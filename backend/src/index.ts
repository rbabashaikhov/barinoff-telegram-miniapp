import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import cors from 'cors';
import express from 'express';
import { config, publicAppConfig } from './config.js';
import { repos } from './container.js';
import { seed } from './db/index.js';
import { db, migrate } from './db/schema.js';
import { eventBus } from './events/bus.js';
import { createCrmAdapter } from './integrations/crm/index.js';
import { registerCrmListeners } from './integrations/listeners.js';
import { logger } from './logger.js';
import { adminRouter } from './routes/admin.js';
import { appointmentsRouter } from './routes/appointments.js';
import { availabilityRouter } from './routes/availability.js';
import { configRouter } from './routes/config.js';
import { mastersRouter } from './routes/masters.js';
import { servicesRouter } from './routes/services.js';

migrate();
seed(db);

const crmAdapter = createCrmAdapter();
registerCrmListeners(eventBus, crmAdapter);

if (config.crm.syncOnStartup && crmAdapter.id !== 'local') {
  void Promise.all([
    crmAdapter.syncServices(
      repos.services.listAll().map((service) => ({
        id: service.id,
        name: service.name,
        description: service.description,
        durationMinutes: service.duration_minutes,
        price: service.price,
        active: Boolean(service.active),
      })),
    ),
    crmAdapter.syncMasters(
      repos.masters.listAll().map((master) => ({
        id: master.id,
        name: master.name,
        role: master.role,
        description: master.description,
        active: Boolean(master.active),
      })),
    ),
  ]).then((results) => {
    const failed = results.filter((item) => !item.ok);
    if (failed.length) {
      logger.error('CRM startup sync failed', { errors: failed.map((item) => item.error) });
    } else {
      logger.info('CRM startup sync completed');
    }
  });
}

const app = express();
const allowedOrigins = new Set([
  config.appUrl,
  'http://localhost:5173',
  'http://127.0.0.1:5173',
]);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin)) {
        callback(null, true);
        return;
      }
      callback(null, false);
    },
    credentials: true,
  }),
);
app.use(express.json({ limit: '32kb' }));
app.set('trust proxy', 1);

app.get('/api/health', (_req, res) => {
  try {
    db.prepare('SELECT 1 AS ok').get();
    res.json({
      ok: true,
      demoMode: config.allowDemoMode,
      crmAdapter: crmAdapter.id,
      timezone: config.timezone,
      businessType: config.business.type,
    });
  } catch (error) {
    logger.error('Healthcheck database failure', {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(503).json({ ok: false, error: 'Database unavailable', code: 'DB_UNAVAILABLE' });
  }
});

app.use('/api/config', configRouter);
app.use('/api/services', servicesRouter);
app.use('/api/masters', mastersRouter);
app.use('/api/availability', availabilityRouter);
app.use('/api/appointments', appointmentsRouter);
app.use('/api/admin', adminRouter);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDirCandidates = [
  config.publicDir || undefined,
  path.join(__dirname, '../public'),
  path.join(process.cwd(), 'public'),
].filter(Boolean) as string[];

const publicDir = publicDirCandidates.find((dir) => fs.existsSync(dir));

if (publicDir) {
  app.use(express.static(publicDir, { index: false, maxAge: '1h' }));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) {
      res.status(404).json({ error: 'Not found', code: 'NOT_FOUND' });
      return;
    }
    res.sendFile(path.join(publicDir, 'index.html'), (err) => {
      if (err) next(err);
    });
  });
}

app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    logger.error('Unhandled request error', { error: err.message });
    res.status(500).json({ error: 'Internal server error', code: 'INTERNAL_ERROR' });
  },
);

if (!config.isTest) {
  app.listen(config.port, '0.0.0.0', () => {
    logger.info('App started', {
      port: config.port,
      publicDir: publicDir || null,
      database: process.env.DATABASE_PATH || 'local default',
      crmAdapter: crmAdapter.id,
      demoMode: config.allowDemoMode,
      adminProtected: config.isProduction || Boolean(config.admin.token),
      business: publicAppConfig(),
    });
    if (!config.admin.token && config.isProduction) {
      logger.warn('ADMIN_TOKEN is not set; /api/admin is locked. Set ADMIN_TOKEN to enable the admin console.');
    } else if (!config.admin.token) {
      logger.warn('ADMIN_TOKEN is not set; /admin is publicly readable in non-production. Set ADMIN_TOKEN before deploying.');
    }
    if (publicDir) {
      logger.info('Serving frontend', { publicDir });
    }
  });
}

export { app, crmAdapter };
