import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  buildPageMeta,
  type PublicCommerce,
  type PublicCommercesQuery,
  type PublicCommercesResponse,
  type PublicPortal,
  type PublicPortalsQuery,
  type PublicPortalsResponse,
} from '@repo/contracts';
import type { Repository } from 'typeorm';

import { CommerceEntity } from '../commerces/entities/commerce.entity';
import { PortalEntity } from '../portals/entities/portal.entity';

function toPublicPortal(entity: PortalEntity): PublicPortal {
  return {
    id: entity.id,
    name: entity.name,
    displayName: entity.displayName,
    serviceType: entity.serviceType,
    description: entity.description,
    logoUrl: entity.logoPath ? `/portals/${entity.id}/logo` : null,
  };
}

function toPublicCommerce(entity: CommerceEntity): PublicCommerce {
  return {
    id: entity.id,
    tradeName: entity.tradeName,
    portalId: entity.portalId,
    portalName: entity.portal.name,
    categoryId: entity.categoryId,
    categoryName: entity.category.name,
  };
}

/**
 * Read-only, unauthenticated projection of the catalog for `portal-web`
 * (docs/frontend/PORTAL_WEB_SOURCE_OF_TRUTH.md, "Public API Architecture").
 * Every query here is filtered to `isPublished = true AND status = 'ACTIVE'`
 * — never delegated to the frontend (portal-web master prompt §7/§18: "la
 * validación DEBE existir en backend, no filtrar únicamente en frontend").
 * A DRAFT/INACTIVE/unpublished Portal or Commerce must be unreachable
 * through this service under any query shape, including by guessing its id.
 */
@Injectable()
export class PublicCatalogService {
  constructor(
    @InjectRepository(PortalEntity)
    private readonly portalsRepository: Repository<PortalEntity>,
    @InjectRepository(CommerceEntity)
    private readonly commercesRepository: Repository<CommerceEntity>,
  ) {}

  async listPortals(query: PublicPortalsQuery): Promise<PublicPortalsResponse> {
    const qb = this.portalsRepository
      .createQueryBuilder('portal')
      .where('portal.isPublished = true')
      .andWhere('portal.status = :status', { status: 'ACTIVE' });

    if (query.q) {
      qb.andWhere('portal.name ILIKE :q', { q: `%${query.q}%` });
    }

    const [rows, total] = await qb
      .orderBy('portal.createdAt', 'ASC')
      .skip((query.page - 1) * query.pageSize)
      .take(query.pageSize)
      .getManyAndCount();

    return { items: rows.map(toPublicPortal), meta: buildPageMeta(query.page, query.pageSize, total) };
  }

  /** 404s for a Portal that is DRAFT/INACTIVE/unpublished — same response as one that doesn't exist at all, never leaking which case it is. */
  async getPortal(id: string): Promise<PublicPortal> {
    const portal = await this.portalsRepository.findOneBy({ id, isPublished: true, status: 'ACTIVE' });
    if (!portal) {
      throw new NotFoundException(`Portal ${id} not found`);
    }
    return toPublicPortal(portal);
  }

  /**
   * Global search across every published+active Commerce of every
   * published+active Portal (master prompt §15: "debe poder encontrar
   * comercios públicos sin importar el portal"). A single query with two
   * joins, not one query per portal/commerce (§59: "no N+1" — the endpoints
   * must return view-appropriate shapes, not force the caller to fan out).
   */
  async searchCommerces(query: PublicCommercesQuery): Promise<PublicCommercesResponse> {
    const qb = this.commercesRepository
      .createQueryBuilder('commerce')
      .innerJoinAndSelect('commerce.portal', 'portal')
      .innerJoinAndSelect('commerce.category', 'category')
      .where('commerce.isPublished = true')
      .andWhere('commerce.status = :commerceStatus', { commerceStatus: 'ACTIVE' })
      .andWhere('portal.isPublished = true')
      .andWhere('portal.status = :portalStatus', { portalStatus: 'ACTIVE' });

    if (query.q) {
      qb.andWhere('commerce.tradeName ILIKE :q', { q: `%${query.q}%` });
    }
    if (query.portalId) {
      qb.andWhere('commerce.portalId = :portalId', { portalId: query.portalId });
    }
    if (query.categoryId) {
      qb.andWhere('commerce.categoryId = :categoryId', { categoryId: query.categoryId });
    }

    const [rows, total] = await qb
      .orderBy('commerce.tradeName', 'ASC')
      .skip((query.page - 1) * query.pageSize)
      .take(query.pageSize)
      .getManyAndCount();

    return { items: rows.map(toPublicCommerce), meta: buildPageMeta(query.page, query.pageSize, total) };
  }
}
