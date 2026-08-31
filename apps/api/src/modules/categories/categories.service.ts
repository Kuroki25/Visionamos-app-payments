import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Category, CreateCategory, UpdateCategory } from '@repo/contracts';
import type { Repository } from 'typeorm';

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
    private readonly scopeAuthorization: ScopeAuthorizationService,
  ) {}

  async create(portalId: string, actor: AuthenticatedRequestUser, input: CreateCategory): Promise<Category> {
    this.scopeAuthorization.assertScope(actor, { portalId });
    const saved = await this.categoriesRepository.save(this.categoriesRepository.create({ ...input, portalId }));
    return toCategory(saved);
  }

  async findAllForPortal(portalId: string, actor: AuthenticatedRequestUser): Promise<Category[]> {
    this.scopeAuthorization.assertScope(actor, { portalId });
    const categories = await this.categoriesRepository.find({ where: { portalId }, order: { createdAt: 'ASC' } });
    return categories.map(toCategory);
  }

  async findOne(id: string, actor: AuthenticatedRequestUser): Promise<Category> {
    const category = await this.loadCategory(id);
    this.scopeAuthorization.assertScope(actor, { portalId: category.portalId });
    return toCategory(category);
  }

  async update(id: string, actor: AuthenticatedRequestUser, input: UpdateCategory): Promise<Category> {
    const category = await this.loadCategory(id);
    this.scopeAuthorization.assertScope(actor, { portalId: category.portalId });
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
}
