import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import type { Commerce, CreateCommerce, UpdateCommerce } from '@repo/contracts';
import type { DataSource, Repository } from 'typeorm';

import type { AuthenticatedRequestUser } from '../auth/types/authenticated-request-user.type';
import { AuditService } from '../audit/audit.service';
import { CategoryEntity } from '../categories/entities/category.entity';
import { ScopeAuthorizationService } from '../role-assignments/scope-authorization.service';
import { CommerceEntity } from './entities/commerce.entity';

function toCommerce(entity: CommerceEntity): Commerce {
  return {
    id: entity.id,
    portalId: entity.portalId,
    categoryId: entity.categoryId,
    tradeName: entity.tradeName,
    legalName: entity.legalName,
    taxId: entity.taxId,
    contactName: entity.contactName,
    contactEmail: entity.contactEmail,
    contactPhone: entity.contactPhone,
    address: entity.address,
    city: entity.city,
    status: entity.status,
    isPublished: entity.isPublished,
    createdAt: entity.createdAt.toISOString(),
    updatedAt: entity.updatedAt.toISOString(),
  };
}

/**
 * `category.portalId === commerce.portalId` is a cross-table invariant
 * PostgreSQL's `CHECK` can't express (docs/adr/011 — CommerceEntity
 * docblock) — enforced here, in `assertCategoryBelongsToPortal`.
 */
@Injectable()
export class CommercesService {
  constructor(
    @InjectRepository(CommerceEntity)
    private readonly commercesRepository: Repository<CommerceEntity>,
    @InjectRepository(CategoryEntity)
    private readonly categoriesRepository: Repository<CategoryEntity>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly scopeAuthorization: ScopeAuthorizationService,
    private readonly auditService: AuditService,
  ) {}

  async create(portalId: string, actor: AuthenticatedRequestUser, input: CreateCommerce): Promise<Commerce> {
    this.scopeAuthorization.assertScope(actor, { portalId });
    await this.assertCategoryBelongsToPortal(input.categoryId, portalId);

    const existingTaxId = await this.commercesRepository.findOneBy({ taxId: input.taxId });
    if (existingTaxId) {
      throw new ConflictException('A commerce with this taxId already exists.');
    }

    const saved = await this.commercesRepository.save(this.commercesRepository.create({ ...input, portalId }));
    return toCommerce(saved);
  }

  /** SUPERADMIN/PORTAL scope see every commerce of the portal; COMMERCE scope sees only their own (docs/business/ROLE_PERMISSION_MATRIX.md §5.4). */
  async findAllForPortal(portalId: string, actor: AuthenticatedRequestUser): Promise<Commerce[]> {
    if (actor.scopeType === 'COMMERCE') {
      const own = actor.scopeCommerceId ? await this.commercesRepository.findOneBy({ id: actor.scopeCommerceId, portalId }) : null;
      return own ? [toCommerce(own)] : [];
    }
    this.scopeAuthorization.assertScope(actor, { portalId });
    const commerces = await this.commercesRepository.find({ where: { portalId }, order: { createdAt: 'ASC' } });
    return commerces.map(toCommerce);
  }

  async findOne(id: string, actor: AuthenticatedRequestUser): Promise<Commerce> {
    const commerce = await this.loadCommerce(id);
    this.scopeAuthorization.assertScope(actor, { portalId: commerce.portalId, commerceId: commerce.id });
    return toCommerce(commerce);
  }

  /** SUPERADMIN and ADMIN_PORTAL (own) only — ADMIN_COMMERCE has no confirmed write access to its own commerce fields in this phase (docs/adr/011 §5, deliberately conservative). */
  async update(id: string, actor: AuthenticatedRequestUser, input: UpdateCommerce): Promise<Commerce> {
    const commerce = await this.loadCommerce(id);
    this.scopeAuthorization.assertScope(actor, { portalId: commerce.portalId });

    if (input.categoryId) {
      await this.assertCategoryBelongsToPortal(input.categoryId, commerce.portalId);
    }

    Object.assign(commerce, input);
    const saved = await this.commercesRepository.save(commerce);
    return toCommerce(saved);
  }

  async updateStatus(id: string, actor: AuthenticatedRequestUser, status: 'ACTIVE' | 'INACTIVE'): Promise<Commerce> {
    const commerce = await this.loadCommerce(id);
    this.scopeAuthorization.assertScope(actor, { portalId: commerce.portalId });

    return this.dataSource.transaction(async (manager) => {
      const previousStatus = commerce.status;
      commerce.status = status;
      const saved = await manager.getRepository(CommerceEntity).save(commerce);

      await this.auditService.record(manager, {
        actorUserId: actor.sub,
        action: status === 'ACTIVE' ? 'COMMERCE_ACTIVATED' : 'COMMERCE_DEACTIVATED',
        targetType: 'COMMERCE',
        targetId: saved.id,
        scopeType: 'PORTAL',
        scopePortalId: saved.portalId,
        previousValue: { status: previousStatus },
        newValue: { status },
      });

      return toCommerce(saved);
    });
  }

  async setPublished(id: string, actor: AuthenticatedRequestUser, isPublished: boolean): Promise<Commerce> {
    const commerce = await this.loadCommerce(id);
    this.scopeAuthorization.assertScope(actor, { portalId: commerce.portalId });

    return this.dataSource.transaction(async (manager) => {
      const previous = commerce.isPublished;
      commerce.isPublished = isPublished;
      const saved = await manager.getRepository(CommerceEntity).save(commerce);

      await this.auditService.record(manager, {
        actorUserId: actor.sub,
        action: isPublished ? 'COMMERCE_PUBLISHED' : 'COMMERCE_UNPUBLISHED',
        targetType: 'COMMERCE',
        targetId: saved.id,
        scopeType: 'PORTAL',
        scopePortalId: saved.portalId,
        previousValue: { isPublished: previous },
        newValue: { isPublished },
      });

      return toCommerce(saved);
    });
  }

  private async assertCategoryBelongsToPortal(categoryId: string, portalId: string): Promise<void> {
    const category = await this.categoriesRepository.findOneBy({ id: categoryId });
    if (!category || category.portalId !== portalId) {
      throw new ConflictException('categoryId does not belong to this portal.');
    }
  }

  private async loadCommerce(id: string): Promise<CommerceEntity> {
    const commerce = await this.commercesRepository.findOneBy({ id });
    if (!commerce) {
      throw new NotFoundException(`Commerce ${id} not found`);
    }
    return commerce;
  }
}
