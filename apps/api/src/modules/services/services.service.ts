import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { CreateService, Service, UpdateService } from '@repo/contracts';
import type { Repository } from 'typeorm';

import type { AuthenticatedRequestUser } from '../auth/types/authenticated-request-user.type';
import { CommerceEntity } from '../commerces/entities/commerce.entity';
import { ScopeAuthorizationService } from '../role-assignments/scope-authorization.service';
import { ServiceEntity } from './entities/service.entity';

function toService(entity: ServiceEntity): Service {
  return {
    id: entity.id,
    commerceId: entity.commerceId,
    name: entity.name,
    createdAt: entity.createdAt.toISOString(),
    updatedAt: entity.updatedAt.toISOString(),
  };
}

@Injectable()
export class ServicesService {
  constructor(
    @InjectRepository(ServiceEntity)
    private readonly servicesRepository: Repository<ServiceEntity>,
    @InjectRepository(CommerceEntity)
    private readonly commercesRepository: Repository<CommerceEntity>,
    private readonly scopeAuthorization: ScopeAuthorizationService,
  ) {}

  async create(commerceId: string, actor: AuthenticatedRequestUser, input: CreateService): Promise<Service> {
    const commerce = await this.loadCommerce(commerceId);
    this.scopeAuthorization.assertScope(actor, { portalId: commerce.portalId, commerceId: commerce.id });
    const saved = await this.servicesRepository.save(this.servicesRepository.create({ ...input, commerceId }));
    return toService(saved);
  }

  async findAllForCommerce(commerceId: string, actor: AuthenticatedRequestUser): Promise<Service[]> {
    const commerce = await this.loadCommerce(commerceId);
    this.scopeAuthorization.assertScope(actor, { portalId: commerce.portalId, commerceId: commerce.id });
    const services = await this.servicesRepository.find({ where: { commerceId }, order: { createdAt: 'ASC' } });
    return services.map(toService);
  }

  async findOne(id: string, actor: AuthenticatedRequestUser): Promise<Service> {
    const service = await this.loadService(id);
    const commerce = await this.loadCommerce(service.commerceId);
    this.scopeAuthorization.assertScope(actor, { portalId: commerce.portalId, commerceId: commerce.id });
    return toService(service);
  }

  async update(id: string, actor: AuthenticatedRequestUser, input: UpdateService): Promise<Service> {
    const service = await this.loadService(id);
    const commerce = await this.loadCommerce(service.commerceId);
    this.scopeAuthorization.assertScope(actor, { portalId: commerce.portalId, commerceId: commerce.id });
    Object.assign(service, input);
    const saved = await this.servicesRepository.save(service);
    return toService(saved);
  }

  private async loadCommerce(id: string): Promise<CommerceEntity> {
    const commerce = await this.commercesRepository.findOneBy({ id });
    if (!commerce) {
      throw new NotFoundException(`Commerce ${id} not found`);
    }
    return commerce;
  }

  private async loadService(id: string): Promise<ServiceEntity> {
    const service = await this.servicesRepository.findOneBy({ id });
    if (!service) {
      throw new NotFoundException(`Service ${id} not found`);
    }
    return service;
  }
}
