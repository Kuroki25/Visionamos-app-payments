import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { Injectable, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Role } from '@repo/contracts';
import type { Request } from 'express';

import { ROLES_KEY } from '../decorators/roles.decorator';
import type { AuthenticatedRequestUser } from '../types/authenticated-request-user.type';

/**
 * Function-level authorization (API5 — Broken Function Level Authorization).
 * Runs after JwtAuthGuard, so `req.user` is already populated. A route with
 * no @Roles(...) is allowed for any authenticated principal. This only
 * checks the four fixed roles — organizational scope (does this
 * ADMIN_PORTAL own *this* portal) is a separate, per-resource check via
 * ScopeAuthorizationService (docs/adr/011), not this guard.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request & { user?: AuthenticatedRequestUser }>();
    if (!request.user || !requiredRoles.includes(request.user.role)) {
      throw new ForbiddenException('You do not have permission to access this resource.');
    }
    return true;
  }
}
