import { timingSafeEqual, createHash } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { config } from '../config.js';

function tokensEqual(provided: string, expected: string): boolean {
  const left = createHash('sha256').update(provided).digest();
  const right = createHash('sha256').update(expected).digest();
  return timingSafeEqual(left, right);
}

export function isAdminPubliclyOpen(token: string, isProduction: boolean): boolean {
  return !isProduction && token.length === 0;
}

export function authorizeAdminRequest(params: {
  expectedToken: string;
  isProduction: boolean;
  providedToken?: string;
}): boolean {
  if (isAdminPubliclyOpen(params.expectedToken, params.isProduction)) {
    return true;
  }
  if (!params.expectedToken || !params.providedToken) {
    return false;
  }
  return tokensEqual(params.providedToken, params.expectedToken);
}

export function readProvidedToken(req: Request): string | undefined {
  return (
    (req.header('x-admin-token') as string | undefined) ||
    (req.header('authorization')?.replace(/^Bearer\s+/i, '') as string | undefined) ||
    (typeof req.query.adminToken === 'string' ? req.query.adminToken : undefined)
  );
}

export function adminAuthMiddleware(req: Request, res: Response, next: NextFunction): void {
  const allowed = authorizeAdminRequest({
    expectedToken: config.admin.token,
    isProduction: config.isProduction,
    providedToken: readProvidedToken(req),
  });

  if (!allowed) {
    res.status(401).json({ error: 'Admin authentication required', code: 'ADMIN_UNAUTHORIZED' });
    return;
  }

  next();
}
