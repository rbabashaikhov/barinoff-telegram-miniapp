import Database from 'better-sqlite3';
import express from 'express';
import fs from 'node:fs';
import http from 'node:http';
import { Socket } from 'node:net';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { config } from '../config.js';
import { seed } from '../db/index.js';
import { applySchema } from '../db/schema.js';
import { adminAuthMiddleware } from '../middleware/adminAuth.js';
import { createSqliteRepositories } from '../repositories/sqlite.js';
import type { Repositories } from '../repositories/types.js';
import { createDemoAdminRouter } from './demoAdmin.js';

function setup() {
  const db = new Database(':memory:');
  applySchema(db);
  seed(db, new Date(2026, 7, 14, 9, 0, 0));
  return { db, repos: createSqliteRepositories(db) };
}

function createApp(repos: Repositories, enabled = true) {
  const app = express();
  app.use(express.json());
  app.use('/api/demo-admin', createDemoAdminRouter(repos, { isEnabled: () => enabled }));
  return app;
}

function dispatch(
  app: express.Express,
  method: string,
  url: string,
  body?: unknown,
): Promise<{ status: number; json: Record<string, unknown> }> {
  return new Promise((resolve, reject) => {
    const req = new http.IncomingMessage(new Socket());
    req.method = method;
    req.url = url;
    req.headers = { host: '127.0.0.1', 'content-type': 'application/json' };

    const payload = body === undefined ? '' : JSON.stringify(body);
    if (payload) {
      req.headers['content-length'] = String(Buffer.byteLength(payload));
    }

    const res = new http.ServerResponse(req);
    const chunks: Buffer[] = [];
    const originalWrite = res.write.bind(res);
    const originalEnd = res.end.bind(res);

    res.write = ((chunk: unknown, encoding?: BufferEncoding, cb?: () => void) => {
      if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk), encoding));
      return originalWrite(chunk as never, encoding as never, cb);
    }) as typeof res.write;

    res.end = ((chunk?: unknown, encoding?: BufferEncoding, cb?: () => void) => {
      if (chunk && typeof chunk !== 'function') {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk), encoding));
      }
      const raw = Buffer.concat(chunks).toString('utf8');
      let json: Record<string, unknown> = {};
      if (raw) {
        try {
          json = JSON.parse(raw) as Record<string, unknown>;
        } catch {
          json = { raw };
        }
      }
      resolve({ status: res.statusCode || 0, json });
      return originalEnd(chunk as never, encoding as never, cb);
    }) as typeof res.end;

    req.on('error', reject);
    res.on('error', reject);
    app(req, res);

    if (payload) {
      req.push(payload);
    }
    req.push(null);
  });
}

describe('demo admin API', () => {
  let db: Database.Database;
  let repos: Repositories;

  beforeEach(() => {
    ({ db, repos } = setup());
  });

  afterEach(() => {
    db.close();
  });

  it('serves public GET endpoints without ADMIN_TOKEN', async () => {
    const app = createApp(repos);
    const [appointments, services, masters, hours, blocked] = await Promise.all([
      dispatch(app, 'GET', '/api/demo-admin/appointments'),
      dispatch(app, 'GET', '/api/demo-admin/services'),
      dispatch(app, 'GET', '/api/demo-admin/masters'),
      dispatch(app, 'GET', '/api/demo-admin/working-hours'),
      dispatch(app, 'GET', '/api/demo-admin/blocked-slots'),
    ]);

    expect(appointments.status).toBe(200);
    expect(services.status).toBe(200);
    expect(masters.status).toBe(200);
    expect(hours.status).toBe(200);
    expect(blocked.status).toBe(200);

    const appointmentPayload = appointments.json as {
      data: Array<{
        date: string;
        startTime: string;
        client: { name: string };
        service: { name: string };
        master: { name: string };
        status: string;
      }>;
    };
    expect(appointmentPayload.data.length).toBeGreaterThan(0);
    const visit = appointmentPayload.data[0];
    expect(visit.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(visit.startTime).toMatch(/^\d{2}:\d{2}$/);
    expect(visit.client.name).toBeTruthy();
    expect(visit.service.name).toBeTruthy();
    expect(visit.master.name).toBeTruthy();
    expect(['confirmed', 'cancelled']).toContain(visit.status);

    const masterPayload = masters.json as {
      data: Array<{ name: string; role: string; serviceIds: number[] }>;
    };
    const maxim = masterPayload.data.find((item) => item.name === 'Максим');
    expect(maxim?.role).toBe('Barber');
    expect(maxim?.serviceIds.length).toBeGreaterThan(0);

    const blockedPayload = blocked.json as {
      data: Array<{ masterId: number; date: string; startTime: string }>;
    };
    expect(blockedPayload.data.length).toBeGreaterThan(0);
  });

  it('rejects mutation methods and does not change the database', async () => {
    const appointmentCount = (
      db.prepare('SELECT COUNT(*) AS count FROM appointments').get() as { count: number }
    ).count;
    const serviceName = (
      db.prepare(`SELECT name FROM services WHERE name = 'Мужская стрижка'`).get() as { name: string }
    ).name;
    const masterActive = (
      db.prepare(`SELECT active FROM masters WHERE name = 'Александр'`).get() as { active: number }
    ).active;
    const hoursCount = (
      db.prepare('SELECT COUNT(*) AS count FROM working_hours').get() as { count: number }
    ).count;
    const blockedCount = (
      db.prepare('SELECT COUNT(*) AS count FROM blocked_slots').get() as { count: number }
    ).count;

    const app = createApp(repos);
    const attempts = await Promise.all([
      dispatch(app, 'POST', '/api/demo-admin/appointments', { status: 'cancelled' }),
      dispatch(app, 'PATCH', '/api/demo-admin/appointments/1', { status: 'cancelled' }),
      dispatch(app, 'PUT', '/api/demo-admin/appointments/1', { status: 'cancelled' }),
      dispatch(app, 'POST', '/api/demo-admin/services', { name: 'Hacked' }),
      dispatch(app, 'PATCH', '/api/demo-admin/services/1', { name: 'Hacked', price: 1 }),
      dispatch(app, 'PUT', '/api/demo-admin/masters/1', { active: false }),
      dispatch(app, 'PUT', '/api/demo-admin/working-hours', { active: false }),
      dispatch(app, 'POST', '/api/demo-admin/blocked-slots', {
        masterId: 1,
        date: '2026-08-17',
        startTime: '12:00',
        endTime: '13:00',
      }),
      dispatch(app, 'DELETE', '/api/demo-admin/blocked-slots/1'),
    ]);

    for (const response of attempts) {
      expect(response.status).toBe(405);
      expect(response.json.code).toBe('DEMO_ADMIN_READ_ONLY');
    }

    expect(
      (db.prepare('SELECT COUNT(*) AS count FROM appointments').get() as { count: number }).count,
    ).toBe(appointmentCount);
    expect(
      (db.prepare(`SELECT name FROM services WHERE name = 'Мужская стрижка'`).get() as { name: string }).name,
    ).toBe(serviceName);
    expect(
      (db.prepare(`SELECT active FROM masters WHERE name = 'Александр'`).get() as { active: number }).active,
    ).toBe(masterActive);
    expect(
      (db.prepare('SELECT COUNT(*) AS count FROM working_hours').get() as { count: number }).count,
    ).toBe(hoursCount);
    expect(
      (db.prepare('SELECT COUNT(*) AS count FROM blocked_slots').get() as { count: number }).count,
    ).toBe(blockedCount);
  });

  it('hides demo admin when the feature is disabled', async () => {
    const response = await dispatch(createApp(repos, false), 'GET', '/api/demo-admin/appointments');
    expect(response.status).toBe(404);
    expect(response.json.code).toBe('NOT_FOUND');
  });

  it('does not use ADMIN_TOKEN and does not wrap real admin auth', () => {
    const source = fs.readFileSync(new URL('./demoAdmin.ts', import.meta.url), 'utf8');
    expect(source).not.toContain('adminAuthMiddleware');
    expect(source).not.toMatch(/ADMIN_TOKEN|adminToken/);
  });
});

describe('real admin stays protected', () => {
  const original = {
    token: config.admin.token,
    isProduction: config.isProduction,
  };

  afterEach(() => {
    config.admin.token = original.token;
    config.isProduction = original.isProduction;
  });

  it('keeps /api/admin locked in production without ADMIN_TOKEN', async () => {
    config.admin.token = '';
    config.isProduction = true;
    const app = express();
    app.use('/api/admin', adminAuthMiddleware, (_req, res) => {
      res.json({ data: [] });
    });
    const response = await dispatch(app, 'GET', '/api/admin/appointments');
    expect(response.status).toBe(401);
    expect(response.json.code).toBe('ADMIN_UNAUTHORIZED');
  });
});
