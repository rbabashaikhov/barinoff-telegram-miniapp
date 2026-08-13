import { timingSafeEqual, createHash } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { config } from '../config.js';

function tokensEqual(provided: string, expected: string): boolean {
  const left = createHash('sha256').update(provided).digest();
  const right = createHash('sha256').update(expected).digest();
  return timingSafeEqual(left, right);
}

export function adminAuthMiddleware(req: Request, res: Response, next: NextFunction): void {
  const expected = config.admin.token;
  if (!expected) {
    next();
    return;
  }

  const headerToken =
    (req.header('x-admin-token') as string | undefined) ||
    (req.header('authorization')?.replace(/^Bearer\s+/i, '') as string | undefined) ||
    (typeof req.query.adminToken === 'string' ? req.query.adminToken : undefined);

  if (!headerToken || !tokensEqual(headerToken, expected)) {
    res.status(401).json({ error: 'Admin authentication required', code: 'ADMIN_UNAUTHORIZED' });
    return;
  }

  next();
}
