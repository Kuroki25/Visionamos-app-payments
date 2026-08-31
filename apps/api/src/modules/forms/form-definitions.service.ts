import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import type { FormDefinition } from '@repo/contracts';
import type { DataSource, Repository } from 'typeorm';

import type { AuthenticatedRequestUser } from '../auth/types/authenticated-request-user.type';
import { ScopeAuthorizationService } from '../role-assignments/scope-authorization.service';
import { FormDefinitionEntity } from './entities/form-definition.entity';
import { FormVersionEntity } from './entities/form-version.entity';
import { FormScopeResolverService } from './form-scope-resolver.service';

function toFormDefinition(entity: FormDefinitionEntity): FormDefinition {
  return {
    id: entity.id,
    serviceId: entity.serviceId,
    createdAt: entity.createdAt.toISOString(),
    updatedAt: entity.updatedAt.toISOString(),
  };
}

/** Service 0..1 FormDefinition (docs/business/DOMAIN_GLOSSARY_RED_COOPAGOS.md §8.1). */
@Injectable()
export class FormDefinitionsService {
  constructor(
    @InjectRepository(FormDefinitionEntity)
    private readonly formDefinitionsRepository: Repository<FormDefinitionEntity>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly scopeAuthorization: ScopeAuthorizationService,
    private readonly scopeResolver: FormScopeResolverService,
  ) {}

  /** Creates the definition and its version #1 (draft, unpublished) together — a definition with zero versions is never a valid state to persist. */
  async create(serviceId: string, actor: AuthenticatedRequestUser): Promise<FormDefinition> {
    const target = await this.scopeResolver.resolveFromServiceId(serviceId);
    this.scopeAuthorization.assertScope(actor, target);

    const existing = await this.formDefinitionsRepository.findOneBy({ serviceId });
    if (existing) {
      throw new ConflictException('This service already has a form definition.');
    }

    return this.dataSource.transaction(async (manager) => {
      const definitionRepo = manager.getRepository(FormDefinitionEntity);
      const versionRepo = manager.getRepository(FormVersionEntity);

      const definition = await definitionRepo.save(definitionRepo.create({ serviceId }));
      await versionRepo.save(
        versionRepo.create({ formDefinitionId: definition.id, versionNumber: 1, status: 'ACTIVE', isPublished: false }),
      );

      return toFormDefinition(definition);
    });
  }

  async findForService(serviceId: string, actor: AuthenticatedRequestUser): Promise<FormDefinition> {
    const target = await this.scopeResolver.resolveFromServiceId(serviceId);
    this.scopeAuthorization.assertScope(actor, target);

    const definition = await this.formDefinitionsRepository.findOneBy({ serviceId });
    if (!definition) {
      throw new NotFoundException(`Service ${serviceId} has no form definition.`);
    }
    return toFormDefinition(definition);
  }
}
