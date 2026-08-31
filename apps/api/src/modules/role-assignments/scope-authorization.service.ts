import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Role } from '@repo/contracts';
import { Repository } from 'typeorm';

import { CommerceEntity } from '../commerces/entities/commerce.entity';
import type { AuthenticatedRequestUser } from '../auth/types/authenticated-request-user.type';

export interface ScopeTarget {
  portalId: string;
  commerceId?: string;
}

export interface RoleAssignmentTarget {
  role: Role;
  scopePortalId?: string | null;
  scopeCommerceId?: string | null;
}

/**
 * BOLA/BFLA primitives shared across every catalog module (docs/adr/011 —
 * "un servicio inyectable, no un guard genérico"). Each caller loads the
 * real resource from the database first, then calls `assertScope` with the
 * portal/commerce ids *from that loaded row* — never from the URL/body
 * directly, which is exactly the gap that would let an ADMIN_PORTAL reach
 * another portal's data by editing an id in the request.
 */
@Injectable()
export class ScopeAuthorizationService {
  constructor(
    @InjectRepository(CommerceEntity)
    private readonly commercesRepository: Repository<CommerceEntity>,
  ) {}

  /** Throws 403 unless `user`'s scope covers `target`. */
  assertScope(user: AuthenticatedRequestUser, target: ScopeTarget): void {
    if (user.scopeType === 'GLOBAL') {
      return;
    }
    if (user.scopeType === 'PORTAL' && user.scopePortalId === target.portalId) {
      return;
    }
    if (user.scopeType === 'COMMERCE' && target.commerceId && user.scopeCommerceId === target.commerceId) {
      return;
    }
    throw new ForbiddenException('You do not have access to this resource scope.');
  }

  /**
   * The user-creation matrix (docs/adr/011 §4). Async: verifying an
   * ADMIN_PORTAL is allowed to create an ADMIN_COMMERCE for a given
   * `scopeCommerceId` requires loading that commerce to check it belongs to
   * the actor's own portal.
   */
  async assertCanAssignRole(actor: AuthenticatedRequestUser, target: RoleAssignmentTarget): Promise<void> {
    if (actor.role === 'SUPERADMIN') {
      return;
    }

    if (actor.role === 'ADMIN_PORTAL') {
      if (target.role === 'ADMIN_COMMERCE') {
        if (!target.scopeCommerceId) {
          throw new ForbiddenException('ADMIN_PORTAL must assign a scopeCommerceId when creating an ADMIN_COMMERCE.');
        }
        const commerce = await this.commercesRepository.findOneBy({ id: target.scopeCommerceId });
        if (!commerce || commerce.portalId !== actor.scopePortalId) {
          throw new ForbiddenException('That commerce does not belong to your portal.');
        }
        return;
      }
      if (target.role === 'VIEWER') {
        if (target.scopeCommerceId || target.scopePortalId !== actor.scopePortalId) {
          throw new ForbiddenException('ADMIN_PORTAL may only create a VIEWER scoped to their own portal.');
        }
        return;
      }
      throw new ForbiddenException('ADMIN_PORTAL may only create ADMIN_COMMERCE or VIEWER users.');
    }

    if (actor.role === 'ADMIN_COMMERCE') {
      if (target.role === 'VIEWER' && !target.scopePortalId && target.scopeCommerceId === actor.scopeCommerceId) {
        return;
      }
      throw new ForbiddenException('ADMIN_COMMERCE may only create a VIEWER scoped to their own commerce.');
    }

    // VIEWER: no creation rights at all — also blocked earlier by @Roles at the route.
    throw new ForbiddenException('You are not allowed to create users.');
  }
}
