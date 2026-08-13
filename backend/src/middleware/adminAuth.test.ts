import fs from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import type { NextFunction, Request, Response } from 'express';
import { config, publicAppConfig } from '../config.js';
import {
  adminAuthMiddleware,
  authorizeAdminRequest,
  isAdminPubliclyOpen,
  readProvidedToken,
} from './adminAuth.js';

const originalAdmin = {
  token: config.admin.token,
  isProduction: config.isProduction,
};

afterEach(() => {
  config.admin.token = originalAdmin.token;
  config.isProduction = originalAdmin.isProduction;
});

describe('admin public access', () => {
  it('allows an empty token only outside production', () => {
    expect(isAdminPubliclyOpen('', false)).toBe(true);
    expect(isAdminPubliclyOpen('', true)).toBe(false);
  });

  it('never treats a configured token as publicly open', () => {
    expect(isAdminPubliclyOpen('secret', false)).toBe(false);
    expect(isAdminPubliclyOpen('secret', true)).toBe(false);
  });
});

describe('admin authorization', () => {
  it('allows unauthenticated admin in local/demo when ADMIN_TOKEN is empty', () => {
    expect(
      authorizeAdminRequest({
        expectedToken: '',
        isProduction: false,
        providedToken: undefined,
      }),
    ).toBe(true);
  });

  it('locks admin in production when ADMIN_TOKEN is empty', () => {
    expect(
      authorizeAdminRequest({
        expectedToken: '',
        isProduction: true,
        providedToken: undefined,
      }),
    ).toBe(false);
  });

  it('does not accept a guessed token when production has no ADMIN_TOKEN', () => {
    expect(
      authorizeAdminRequest({
        expectedToken: '',
        isProduction: true,
        providedToken: 'anything',
      }),
    ).toBe(false);
  });

  it('accepts the configured token via header value', () => {
    expect(
      authorizeAdminRequest({
        expectedToken: 'ops-secret',
        isProduction: true,
        providedToken: 'ops-secret',
      }),
    ).toBe(true);
  });

  it('rejects a missing token when ADMIN_TOKEN is set', () => {
    expect(
      authorizeAdminRequest({
        expectedToken: 'ops-secret',
        isProduction: false,
        providedToken: undefined,
      }),
    ).toBe(false);
  });

  it('rejects a wrong token', () => {
    expect(
      authorizeAdminRequest({
        expectedToken: 'ops-secret',
        isProduction: true,
        providedToken: 'nope',
      }),
    ).toBe(false);
  });
});

function fakeRequest(headers: Record<string, string> = {}, query: Record<string, unknown> = {}) {
  return {
    header(name: string) {
      return headers[name.toLowerCase()];
    },
    query,
  } as Request;
}

function invoke(req: Request): { status: number; body: unknown; nextCalled: boolean } {
  const res = {
    statusCode: 200,
    body: undefined as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
  };
  let nextCalled = false;
  adminAuthMiddleware(req, res as unknown as Response, (() => {
    nextCalled = true;
  }) as NextFunction);
  return { status: res.statusCode, body: res.body, nextCalled };
}

describe('admin token headers', () => {
  it('reads x-admin-token', () => {
    const provided = readProvidedToken(fakeRequest({ 'x-admin-token': 'ops-secret' }));
    expect(provided).toBe('ops-secret');
    expect(
      authorizeAdminRequest({
        expectedToken: 'ops-secret',
        isProduction: true,
        providedToken: provided,
      }),
    ).toBe(true);
  });

  it('reads Authorization Bearer', () => {
    const provided = readProvidedToken(fakeRequest({ authorization: 'Bearer ops-secret' }));
    expect(provided).toBe('ops-secret');
    expect(
      authorizeAdminRequest({
        expectedToken: 'ops-secret',
        isProduction: true,
        providedToken: provided,
      }),
    ).toBe(true);
  });
});

describe('adminAuthMiddleware', () => {
  it('allows admin in development when ADMIN_TOKEN is empty', () => {
    config.admin.token = '';
    config.isProduction = false;
    const result = invoke(fakeRequest());
    expect(result.nextCalled).toBe(true);
    expect(result.status).toBe(200);
  });

  it('returns 401 ADMIN_UNAUTHORIZED in production when ADMIN_TOKEN is empty', () => {
    config.admin.token = '';
    config.isProduction = true;
    const result = invoke(fakeRequest());
    expect(result.nextCalled).toBe(false);
    expect(result.status).toBe(401);
    expect(result.body).toMatchObject({ code: 'ADMIN_UNAUTHORIZED' });
  });

  it('allows production admin with the correct token via x-admin-token', () => {
    config.admin.token = 'ops-secret';
    config.isProduction = true;
    const result = invoke(fakeRequest({ 'x-admin-token': 'ops-secret' }));
    expect(result.nextCalled).toBe(true);
    expect(result.status).toBe(200);
  });

  it('allows production admin with Authorization Bearer', () => {
    config.admin.token = 'ops-secret';
    config.isProduction = true;
    const result = invoke(fakeRequest({ authorization: 'Bearer ops-secret' }));
    expect(result.nextCalled).toBe(true);
    expect(result.status).toBe(200);
  });

  it('rejects a wrong production token', () => {
    config.admin.token = 'ops-secret';
    config.isProduction = true;
    const result = invoke(fakeRequest({ 'x-admin-token': 'nope' }));
    expect(result.nextCalled).toBe(false);
    expect(result.status).toBe(401);
    expect(result.body).toMatchObject({ code: 'ADMIN_UNAUTHORIZED' });
  });

  it('does not wrap public client API routes', () => {
    const files = ['services.ts', 'masters.ts', 'appointments.ts', 'availability.ts', 'config.ts'];
    for (const file of files) {
      const source = fs.readFileSync(new URL(`../routes/${file}`, import.meta.url), 'utf8');
      expect(source, file).not.toContain('adminAuthMiddleware');
    }
  });
});

describe('public config adminProtected', () => {
  it('is true in production even when ADMIN_TOKEN is empty', () => {
    config.admin.token = '';
    config.isProduction = true;
    const published = publicAppConfig();
    expect(published.adminProtected).toBe(true);
    expect(published).not.toHaveProperty('adminToken');
    expect(JSON.stringify(published)).not.toContain('ADMIN_TOKEN');
  });

  it('is false in development when ADMIN_TOKEN is empty', () => {
    config.admin.token = '';
    config.isProduction = false;
    expect(publicAppConfig().adminProtected).toBe(false);
  });
});
