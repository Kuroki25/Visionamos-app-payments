import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { type CreatePortal, PORTAL_LOGO_MAX_BYTES, type Portal, type UpdatePortal } from '@repo/contracts';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { DataSource, Repository } from 'typeorm';

import type { AuthenticatedRequestUser } from '../auth/types/authenticated-request-user.type';
import { AuditService } from '../audit/audit.service';
import { ScopeAuthorizationService } from '../role-assignments/scope-authorization.service';
import { PortalEntity } from './entities/portal.entity';
import { detectImageMimeType, ensurePortalLogosDir, generateLogoFilename, PORTAL_LOGOS_DIR } from './portal-logo-storage';

function toPortal(entity: PortalEntity): Portal {
  return {
    id: entity.id,
    name: entity.name,
    displayName: entity.displayName,
    serviceType: entity.serviceType,
    description: entity.description,
    logoUrl: entity.logoPath ? `/portals/${entity.id}/logo` : null,
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
        displayName: input.displayName,
        serviceType: input.serviceType,
        description: input.description,
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

  /**
   * `POST /portals/:id/logo` (docs/frontend/DASHBOARD_SOURCE_OF_TRUTH.md
   * §17.2). Same authorization as any other portal write
   * (`assertScope`) — an ADMIN_PORTAL can only upload to their own portal.
   * `multer`'s interceptor already enforces MIME/size at the HTTP layer
   * (`portals.controller.ts`) — this is the second, authoritative check
   * (OWASP: never trust a client-supplied `Content-Type` alone), by
   * reading the file's real magic bytes. A mismatched/unrecognized file
   * is rejected here even if it slipped past the interceptor.
   */
  async uploadLogo(id: string, actor: AuthenticatedRequestUser, file: Express.Multer.File): Promise<Portal> {
    const portal = await this.loadPortal(id);
    this.scopeAuthorization.assertScope(actor, { portalId: portal.id });

    if (file.size > PORTAL_LOGO_MAX_BYTES) {
      throw new BadRequestException(`Logo file exceeds the ${PORTAL_LOGO_MAX_BYTES} byte limit.`);
    }
    const mimeType = detectImageMimeType(file.buffer);
    if (!mimeType) {
      throw new BadRequestException('Logo must be a real PNG, JPEG, or WebP file.');
    }

    await ensurePortalLogosDir();
    const filename = generateLogoFilename(mimeType);
    await fs.writeFile(path.join(PORTAL_LOGOS_DIR, filename), file.buffer);

    const previousLogoPath = portal.logoPath;
    portal.logoPath = filename;
    const saved = await this.portalsRepository.save(portal);

    if (previousLogoPath) {
      // Best-effort cleanup of the replaced file — never fails the request
      // over it (e.g. already gone from a previous partial run).
      await fs.unlink(path.join(PORTAL_LOGOS_DIR, previousLogoPath)).catch(() => undefined);
    }

    return toPortal(saved);
  }

  /**
   * `GET /portals/:id/logo` — deliberately `@Public()` (see the
   * controller): a logo is not sensitive data (every authenticated role
   * that can list portals can already see it inline), and a plain
   * `<img src>` tag never sends the session cookie cross-origin, so
   * gating this route the same as the rest of the API would just break
   * the image with no security benefit — see §17.2 for the full reasoning.
   */
  async getLogoAbsolutePath(id: string): Promise<string> {
    const portal = await this.loadPortal(id);
    if (!portal.logoPath) {
      throw new NotFoundException(`Portal ${id} has no logo.`);
    }
    return path.join(PORTAL_LOGOS_DIR, portal.logoPath);
  }

  private async loadPortal(id: string): Promise<PortalEntity> {
    const portal = await this.portalsRepository.findOneBy({ id });
    if (!portal) {
      throw new NotFoundException(`Portal ${id} not found`);
    }
    return portal;
  }
}
