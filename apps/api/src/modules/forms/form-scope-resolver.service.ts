import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';

import { CommerceEntity } from '../commerces/entities/commerce.entity';
import type { ScopeTarget } from '../role-assignments/scope-authorization.service';
import { ServiceEntity } from '../services/entities/service.entity';
import { FormDefinitionEntity } from './entities/form-definition.entity';
import { FormVersionEntity } from './entities/form-version.entity';

/**
 * The forms subdomain is four FK hops away from the Commerce/Portal a scope
 * check actually needs (FormField → FormVersion → FormDefinition → Service
 * → Commerce → Portal, docs/business/DOMAIN_RELATIONSHIPS.md §8 — "validar
 * la cadena, no confiar en IDs aislados"). Every forms service needs the
 * same chain resolved, so it lives here once instead of four times.
 */
@Injectable()
export class FormScopeResolverService {
  constructor(
    @InjectRepository(ServiceEntity)
    private readonly servicesRepository: Repository<ServiceEntity>,
    @InjectRepository(CommerceEntity)
    private readonly commercesRepository: Repository<CommerceEntity>,
    @InjectRepository(FormDefinitionEntity)
    private readonly formDefinitionsRepository: Repository<FormDefinitionEntity>,
    @InjectRepository(FormVersionEntity)
    private readonly formVersionsRepository: Repository<FormVersionEntity>,
  ) {}

  async resolveFromServiceId(serviceId: string): Promise<ScopeTarget> {
    const service = await this.servicesRepository.findOneBy({ id: serviceId });
    if (!service) {
      throw new NotFoundException(`Service ${serviceId} not found`);
    }
    return this.resolveFromCommerceId(service.commerceId);
  }

  async resolveFromFormDefinitionId(formDefinitionId: string): Promise<ScopeTarget> {
    const definition = await this.formDefinitionsRepository.findOneBy({ id: formDefinitionId });
    if (!definition) {
      throw new NotFoundException(`FormDefinition ${formDefinitionId} not found`);
    }
    return this.resolveFromServiceId(definition.serviceId);
  }

  async resolveFromFormVersionId(formVersionId: string): Promise<ScopeTarget> {
    const version = await this.formVersionsRepository.findOneBy({ id: formVersionId });
    if (!version) {
      throw new NotFoundException(`FormVersion ${formVersionId} not found`);
    }
    return this.resolveFromFormDefinitionId(version.formDefinitionId);
  }

  private async resolveFromCommerceId(commerceId: string): Promise<ScopeTarget> {
    const commerce = await this.commercesRepository.findOneBy({ id: commerceId });
    if (!commerce) {
      throw new NotFoundException(`Commerce ${commerceId} not found`);
    }
    return { portalId: commerce.portalId, commerceId: commerce.id };
  }
}
