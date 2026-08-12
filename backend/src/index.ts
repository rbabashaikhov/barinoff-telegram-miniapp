import 'dotenv/config';
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

app.use(
  cors({
    origin: [appUrl, 'http://localhost:5173', 'http://127.0.0.1:5173'],
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
  app.listen(port, () => {
    console.log(`API listening on http://localhost:${port}`);
  });
}

export { app };
