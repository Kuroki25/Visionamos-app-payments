import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Category, CreateCategory, UpdateCategory } from '@repo/contracts';
import type { Repository } from 'typeorm';

import { CommerceEntity } from '../commerces/entities/commerce.entity';
import type { AuthenticatedRequestUser } from '../auth/types/authenticated-request-user.type';
import { ScopeAuthorizationService } from '../role-assignments/scope-authorization.service';
import { CategoryEntity } from './entities/category.entity';

function toCategory(entity: CategoryEntity): Category {
  return {
    id: entity.id,
    portalId: entity.portalId,
    name: entity.name,
    createdAt: entity.createdAt.toISOString(),
    updatedAt: entity.updatedAt.toISOString(),
  };
}

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(CategoryEntity)
    private readonly categoriesRepository: Repository<CategoryEntity>,
    @InjectRepository(CommerceEntity)
    private readonly commercesRepository: Repository<CommerceEntity>,
    private readonly scopeAuthorization: ScopeAuthorizationService,
  ) {}

  async create(portalId: string, actor: AuthenticatedRequestUser, input: CreateCategory): Promise<Category> {
    await this.assertPortalScope(actor, portalId);
    const saved = await this.categoriesRepository.save(this.categoriesRepository.create({ ...input, portalId }));
    return toCategory(saved);
  }

  async findAllForPortal(portalId: string, actor: AuthenticatedRequestUser): Promise<Category[]> {
    await this.assertPortalScope(actor, portalId);
    const categories = await this.categoriesRepository.find({ where: { portalId }, order: { createdAt: 'ASC' } });
    return categories.map(toCategory);
  }

  async findOne(id: string, actor: AuthenticatedRequestUser): Promise<Category> {
    const category = await this.loadCategory(id);
    await this.assertPortalScope(actor, category.portalId);
    return toCategory(category);
  }

  async update(id: string, actor: AuthenticatedRequestUser, input: UpdateCategory): Promise<Category> {
    const category = await this.loadCategory(id);
    await this.assertPortalScope(actor, category.portalId);
    Object.assign(category, input);
    const saved = await this.categoriesRepository.save(category);
    return toCategory(saved);
  }

  private async loadCategory(id: string): Promise<CategoryEntity> {
    const category = await this.categoriesRepository.findOneBy({ id });
    if (!category) {
      throw new NotFoundException(`Category ${id} not found`);
    }
    return category;
  }

  /**
   * Category has no `commerceId` of its own — it belongs directly to a
   * Portal, and a Portal has many Commerces — so `ScopeAuthorizationService
   * .assertScope`'s COMMERCE branch (which matches a single `target
   * .commerceId`) can never apply here directly. A COMMERCE-scoped actor
   * (ADMIN_COMMERCE or a VIEWER scoped to a commerce) is authorized for a
   * category iff their own commerce belongs to that category's portal —
   * verified by loading their commerce and comparing `portalId`, the same
   * "load the real resource, then check" pattern ADR 011 uses everywhere
   * else (docs/auth-migration/02-business-access-model.md, GAP-01).
   */
  private async assertPortalScope(actor: AuthenticatedRequestUser, portalId: string): Promise<void> {
    if (actor.scopeType === 'COMMERCE') {
      const ownCommerce = actor.scopeCommerceId
        ? await this.commercesRepository.findOneBy({ id: actor.scopeCommerceId, portalId })
        : null;
      if (!ownCommerce) {
        throw new ForbiddenException('You do not have access to this resource scope.');
      }
      return;
    }
    this.scopeAuthorization.assertScope(actor, { portalId });
  }
}
