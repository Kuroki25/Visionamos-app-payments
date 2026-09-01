import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { fromNodeHeaders } from 'better-auth/node';
import type { Request } from 'express';
import type { Repository } from 'typeorm';

import { IS_PUBLIC_KEY } from '../../modules/auth/decorators/public.decorator';
import type { AuthenticatedRequestUser } from '../../modules/auth/types/authenticated-request-user.type';
import { RoleAssignmentEntity } from '../../modules/role-assignments/entities/role-assignment.entity';
import { UserEntity } from '../../modules/users/entities/user.entity';
import type { BetterAuthInstance } from './better-auth.factory';
import { BETTER_AUTH_INSTANCE } from './better-auth.token';

/**
 * Fase 6 (docs/adr/013-better-auth-migration.md, "Integración con NestJS") —
 * the `AuthenticationPort` the ADR calls for, made concrete: this guard is
 * the *only* thing that changes about how a request is authenticated. It is
 * a drop-in replacement for `JwtAuthGuard` and nothing else — same
 * `@Public()` opt-out (`IS_PUBLIC_KEY`, reused verbatim, not redefined), same
 * `request.user` shape (`AuthenticatedRequestUser`), same deny-by-default
 * behaviour (`UnauthorizedException` on anything short of a fully resolved,
 * active, role-assigned user). `RolesGuard`, `CsrfGuard`,
 * `ScopeAuthorizationService`, and every controller/service downstream of
 * `@CurrentUser()` need zero changes to keep working against this guard —
 * that is the whole point of the swap.
 *
 * NOT registered in `app.module.ts` yet — still isolated infrastructure
 * (Fase 6 builds and proves it; the cutover into the live `APP_GUARD` chain,
 * possibly behind an `AUTH_PROVIDER` flag, is Fase 10 per the master
 * prompt's phase plan).
 *
 * Where this necessarily differs from `JwtAuthGuard`, by design (ADR 013,
 * "Consecuencia a decidir en Fase 4/8"): Better Auth only resolves identity
 * (`session.userId`) — it knows nothing about `role`/`scopeType`/
 * `scopePortalId`/`scopeCommerceId`, which stay 100% owned by
 * `role_assignments`. That means this guard, unlike `JwtAuthGuard`, always
 * hits the database (two `findOneBy` reads) on every authenticated request
 * instead of trusting an embedded JWT claim — the trade this ADR made
 * deliberately to fix AUTH-01, still unmeasured (Fase 8 baseline pending).
 */
@Injectable()
export class BetterAuthSessionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(BETTER_AUTH_INSTANCE) private readonly auth: BetterAuthInstance,
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,
    @InjectRepository(RoleAssignmentEntity)
    private readonly roleAssignmentsRepository: Repository<RoleAssignmentEntity>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request & { user?: AuthenticatedRequestUser }>();

    // `fromNodeHeaders` is Better Auth's own official adapter from Express's
    // `IncomingHttpHeaders` to the WHATWG `Headers` its framework-agnostic
    // `auth.api.*` surface expects (`better-auth/node`, verified against the
    // installed package's types — docs/auth-migration/04-infrastructure-implementation.md).
    const result = await this.auth.api.getSession({ headers: fromNodeHeaders(request.headers) });
    if (!result?.session || !result.user) {
      throw new UnauthorizedException('Missing or invalid session.');
    }

    const userId = result.user.id;
    const [profile, assignment] = await Promise.all([
      this.usersRepository.findOneBy({ id: userId }),
      this.roleAssignmentsRepository.findOneBy({ userId }),
    ]);

    // Mirrors AuthService.rotateRefreshToken's re-validation today (Fase 1):
    // a session token alone is never enough — status/role/scope are always
    // re-read fresh, never cached on the session itself.
    if (!profile || profile.status !== 'ACTIVE') {
      throw new UnauthorizedException('This account is no longer active.');
    }
    if (!assignment) {
      throw new UnauthorizedException('This account has no role assignment.');
    }

    request.user = {
      sub: userId,
      role: assignment.role,
      scopeType: assignment.scopeType,
      scopePortalId: assignment.scopePortalId,
      scopeCommerceId: assignment.scopeCommerceId,
    };
    return true;
  }
}
