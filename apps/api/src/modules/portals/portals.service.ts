import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import type { CreatePortal, Portal, UpdatePortal } from '@repo/contracts';
import type { DataSource, Repository } from 'typeorm';

import type { AuthenticatedRequestUser } from '../auth/types/authenticated-request-user.type';
import { AuditService } from '../audit/audit.service';
import { ScopeAuthorizationService } from '../role-assignments/scope-authorization.service';
import { PortalEntity } from './entities/portal.entity';

function toPortal(entity: PortalEntity): Portal {
  return {
    id: entity.id,
    name: entity.name,
    status: entity.status,
    isPublished: entity.isPublished,
    createdAt: entity.createdAt.toISOString(),
    updatedAt: entity.updatedAt.toISOString(),
  };
}

/**
 * Plain create/edit is not audited (docs/adr/011 §1, audit_action enum) —
 * BR-046 calls out state/visibility changes and role/scope changes
 * specifically, not every ordinary write. `updateStatus`/`publish`/
 * `unpublish` are, because they gate whether a Portal can operate or is
 * visible at all.
 */
@Injectable()
export class PortalsService {
  constructor(
    @InjectRepository(PortalEntity)
    private readonly portalsRepository: Repository<PortalEntity>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly scopeAuthorization: ScopeAuthorizationService,
    private readonly auditService: AuditService,
  ) {}

  async create(input: CreatePortal): Promise<Portal> {
    // `exactOptionalPropertyTypes` rejects `status: undefined` explicitly —
    // the key must be entirely absent (not just optional) for TypeORM's
    // `DeepPartial` to fall through to the column's own `ACTIVE` default.
    const saved = await this.portalsRepository.save(
      this.portalsRepository.create({
        name: input.name,
        ...(input.status !== undefined ? { status: input.status } : {}),
      }),
    );
    return toPortal(saved);
  }

  /** VIEWER/SUPERADMIN with GLOBAL scope see all; PORTAL scope sees only their own. ADMIN_COMMERCE is blocked entirely at the route (docs/business/ROLE_PERMISSION_MATRIX.md §5.2). */
  async findAll(actor: AuthenticatedRequestUser): Promise<Portal[]> {
    if (actor.scopeType === 'PORTAL' && actor.scopePortalId) {
      const portal = await this.portalsRepository.findOneBy({ id: actor.scopePortalId });
      return portal ? [toPortal(portal)] : [];
    }
    if (actor.scopeType === 'COMMERCE') {
      return [];
    }
    const portals = await this.portalsRepository.find({ order: { createdAt: 'ASC' } });
    return portals.map(toPortal);
  }

  async findOne(id: string, actor: AuthenticatedRequestUser): Promise<Portal> {
    const portal = await this.loadPortal(id);
    this.scopeAuthorization.assertScope(actor, { portalId: portal.id });
    return toPortal(portal);
  }

  async update(id: string, actor: AuthenticatedRequestUser, input: UpdatePortal): Promise<Portal> {
    const portal = await this.loadPortal(id);
    this.scopeAuthorization.assertScope(actor, { portalId: portal.id });
    Object.assign(portal, input);
    const saved = await this.portalsRepository.save(portal);
    return toPortal(saved);
  }

  async updateStatus(id: string, actor: AuthenticatedRequestUser, status: 'ACTIVE' | 'INACTIVE'): Promise<Portal> {
    const portal = await this.loadPortal(id);
    this.scopeAuthorization.assertScope(actor, { portalId: portal.id });

    return this.dataSource.transaction(async (manager) => {
      const previousStatus = portal.status;
      portal.status = status;
      const saved = await manager.getRepository(PortalEntity).save(portal);

      await this.auditService.record(manager, {
        actorUserId: actor.sub,
        action: status === 'ACTIVE' ? 'PORTAL_ACTIVATED' : 'PORTAL_DEACTIVATED',
        targetType: 'PORTAL',
        targetId: saved.id,
        scopeType: 'PORTAL',
        scopePortalId: saved.id,
        previousValue: { status: previousStatus },
        newValue: { status },
      });

      return toPortal(saved);
    });
  }

  async setPublished(id: string, actor: AuthenticatedRequestUser, isPublished: boolean): Promise<Portal> {
    const portal = await this.loadPortal(id);
    this.scopeAuthorization.assertScope(actor, { portalId: portal.id });

    return this.dataSource.transaction(async (manager) => {
      const previous = portal.isPublished;
      portal.isPublished = isPublished;
      const saved = await manager.getRepository(PortalEntity).save(portal);

      await this.auditService.record(manager, {
        actorUserId: actor.sub,
        action: isPublished ? 'PORTAL_PUBLISHED' : 'PORTAL_UNPUBLISHED',
        targetType: 'PORTAL',
        targetId: saved.id,
        scopeType: 'PORTAL',
        scopePortalId: saved.id,
        previousValue: { isPublished: previous },
        newValue: { isPublished },
      });

      return toPortal(saved);
    });
  }

  private async loadPortal(id: string): Promise<PortalEntity> {
    const portal = await this.portalsRepository.findOneBy({ id });
    if (!portal) {
      throw new NotFoundException(`Portal ${id} not found`);
    }
    return portal;
  }
}
