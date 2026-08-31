import type { NestMiddleware } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';

import type { Env } from '../../../config/env.schema';

export const CSRF_COOKIE_NAME = 'csrf_token';

/**
 * Double-submit CSRF cookie (section 20/23). Runs on every request; if the
 * client has no csrf_token cookie yet, issues one. The cookie is
 * intentionally NOT httpOnly — the frontend must be able to read it and echo
 * it back as the X-CSRF-Token header (see CsrfGuard) for this pattern to
 * work at all.
 */
@Injectable()
export class CsrfCookieMiddleware implements NestMiddleware {
  constructor(private readonly config: ConfigService<Env, true>) {}

  use(req: Request, res: Response, next: NextFunction): void {
    if (!req.cookies?.[CSRF_COOKIE_NAME]) {
      res.cookie(CSRF_COOKIE_NAME, randomUUID(), {
        httpOnly: false,
        secure: this.config.get('COOKIE_SECURE', { infer: true }),
        sameSite: 'lax',
        path: '/',
      });
    }
    next();
  }
}
