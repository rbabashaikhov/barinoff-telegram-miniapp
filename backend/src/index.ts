import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import cors from 'cors';
import express from 'express';
import { seed } from './db/index.js';
import { db, migrate } from './db/schema.js';
import { adminRouter } from './routes/admin.js';
import { appointmentsRouter } from './routes/appointments.js';
import { availabilityRouter } from './routes/availability.js';
import { servicesRouter } from './routes/services.js';

migrate();
seed(db);

const app = express();
const port = Number(process.env.API_PORT || process.env.PORT || 3000);
const appUrl = process.env.APP_URL || 'http://localhost:5173';

const allowedOrigins = new Set([
  appUrl,
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
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    demoMode:
      process.env.ALLOW_DEMO_MODE === 'true' ||
      process.env.NODE_ENV !== 'production' ||
      !process.env.TELEGRAM_BOT_TOKEN,
  });
});

app.use('/api/services', servicesRouter);
app.use('/api/availability', availabilityRouter);
app.use('/api/appointments', appointmentsRouter);
app.use('/api/admin', adminRouter);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDirCandidates = [
  process.env.PUBLIC_DIR,
  path.join(__dirname, '../public'),
  path.join(process.cwd(), 'public'),
].filter(Boolean) as string[];

const publicDir = publicDirCandidates.find((dir) => fs.existsSync(dir));

if (publicDir) {
  app.use(express.static(publicDir, { index: false, maxAge: '1h' }));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) {
      res.status(404).json({ error: 'Not found' });
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
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  },
);

if (process.env.NODE_ENV !== 'test') {
  app.listen(port, '0.0.0.0', () => {
    console.log(`App listening on http://0.0.0.0:${port}`);
    if (publicDir) {
      console.log(`Serving frontend from ${publicDir}`);
    }
  });
}

export { app };
