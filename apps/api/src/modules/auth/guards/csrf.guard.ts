import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { ForbiddenException, Injectable } from '@nestjs/common';
import type { Request } from 'express';

import { CSRF_COOKIE_NAME } from '../middleware/csrf-cookie.middleware';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const CSRF_HEADER_NAME = 'x-csrf-token';

/**
 * Double-submit CSRF check (section 20/23): a request that relies on
 * cookies for authentication must also echo the (non-httpOnly) csrf_token
 * cookie value back as a header — something only same-origin JavaScript
 * (never a cross-site <form> submission) can read and do. Applied globally;
 * safe/idempotent methods are exempt.
 */
@Injectable()
export class CsrfGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    if (SAFE_METHODS.has(request.method)) {
      return true;
    }

    // cookie-parser types req.cookies as `any` — annotate as `unknown` at the
    // boundary instead of letting that `any` propagate (section 6).
    const cookieToken: unknown = request.cookies?.[CSRF_COOKIE_NAME];
    const headerToken = request.headers[CSRF_HEADER_NAME];

    if (
      typeof cookieToken !== 'string' ||
      typeof headerToken !== 'string' ||
      cookieToken.length === 0 ||
      cookieToken !== headerToken
    ) {
      throw new ForbiddenException('Missing or invalid CSRF token.');
    }
    return true;
  }
}
