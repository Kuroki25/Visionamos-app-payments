import type { ExecutionContext } from '@nestjs/common';
import { createParamDecorator } from '@nestjs/common';
import type { Request } from 'express';

import type { AuthenticatedRequestUser } from '../types/authenticated-request-user.type';

/** Reads the principal JwtAuthGuard attached to the request. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedRequestUser => {
    const request = ctx.switchToHttp().getRequest<Request & { user?: AuthenticatedRequestUser }>();
    if (!request.user) {
      throw new Error('CurrentUser used on a route without JwtAuthGuard.');
    }
    return request.user;
  },
);
