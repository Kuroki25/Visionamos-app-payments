import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import type { EntityStatus, FormVersion, FormVersionWithFields } from '@repo/contracts';
import type { DataSource, Repository } from 'typeorm';

import type { AuthenticatedRequestUser } from '../auth/types/authenticated-request-user.type';
import { AuditService } from '../audit/audit.service';
import { ScopeAuthorizationService } from '../role-assignments/scope-authorization.service';
import { FormFieldEntity } from './entities/form-field.entity';
import { FormVersionEntity } from './entities/form-version.entity';
import { FormScopeResolverService } from './form-scope-resolver.service';

function toFormVersion(entity: FormVersionEntity): FormVersion {
  return {
    id: entity.id,
    formDefinitionId: entity.formDefinitionId,
    versionNumber: entity.versionNumber,
    status: entity.status,
    isPublished: entity.isPublished,
    createdAt: entity.createdAt.toISOString(),
    updatedAt: entity.updatedAt.toISOString(),
  };
}

/**
 * Publishing enforces "at most one published version per definition" via
 * both a transactional unpublish-then-publish here AND the database's
 * partial unique index (`ux_form_versions_one_published`,
 * FormVersionEntity) — the index is the backstop if this transaction is
 * ever bypassed by a bug, not decorative.
 */
@Injectable()
export class FormVersionsService {
  constructor(
    @InjectRepository(FormVersionEntity)
    private readonly formVersionsRepository: Repository<FormVersionEntity>,
    @InjectRepository(FormFieldEntity)
    private readonly formFieldsRepository: Repository<FormFieldEntity>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly scopeAuthorization: ScopeAuthorizationService,
    private readonly scopeResolver: FormScopeResolverService,
    private readonly auditService: AuditService,
  ) {}

  async create(formDefinitionId: string, actor: AuthenticatedRequestUser): Promise<FormVersion> {
    const target = await this.scopeResolver.resolveFromFormDefinitionId(formDefinitionId);
    this.scopeAuthorization.assertScope(actor, target);

    const latest = await this.formVersionsRepository.findOne({
      where: { formDefinitionId },
      order: { versionNumber: 'DESC' },
    });
    const nextVersionNumber = (latest?.versionNumber ?? 0) + 1;

    const saved = await this.formVersionsRepository.save(
      this.formVersionsRepository.create({
        formDefinitionId,
        versionNumber: nextVersionNumber,
        status: 'ACTIVE',
        isPublished: false,
      }),
    );
    return toFormVersion(saved);
  }

  async findAllForDefinition(formDefinitionId: string, actor: AuthenticatedRequestUser): Promise<FormVersion[]> {
    const target = await this.scopeResolver.resolveFromFormDefinitionId(formDefinitionId);
    this.scopeAuthorization.assertScope(actor, target);

    const versions = await this.formVersionsRepository.find({
      where: { formDefinitionId },
      order: { versionNumber: 'DESC' },
    });
    return versions.map(toFormVersion);
  }

  async findOne(id: string, actor: AuthenticatedRequestUser): Promise<FormVersionWithFields> {
    const version = await this.loadVersion(id);
    const target = await this.scopeResolver.resolveFromFormDefinitionId(version.formDefinitionId);
    this.scopeAuthorization.assertScope(actor, target);

    const fields = await this.formFieldsRepository.find({ where: { formVersionId: id }, order: { sortOrder: 'ASC' } });
    return {
      ...toFormVersion(version),
      fields: fields.map((field) => ({
        id: field.id,
        formVersionId: field.formVersionId,
        key: field.key,
        label: field.label,
        type: field.type,
        isRequired: field.isRequired,
        sortOrder: field.sortOrder,
        options: field.options,
        validationRules: field.validationRules,
        createdAt: field.createdAt.toISOString(),
        updatedAt: field.updatedAt.toISOString(),
      })),
    };
  }

  async updateStatus(id: string, actor: AuthenticatedRequestUser, status: EntityStatus): Promise<FormVersion> {
    const version = await this.loadVersion(id);
    const target = await this.scopeResolver.resolveFromFormDefinitionId(version.formDefinitionId);
    this.scopeAuthorization.assertScope(actor, target);

    version.status = status;
    const saved = await this.formVersionsRepository.save(version);
    return toFormVersion(saved);
  }

  /** SUPERADMIN/ADMIN_PORTAL only — enforced by @Roles at the route (ADMIN_COMMERCE edits, never publishes — docs/business/ROLE_PERMISSION_MATRIX.md §5.6). */
  async publish(id: string, actor: AuthenticatedRequestUser): Promise<FormVersion> {
    const version = await this.loadVersion(id);
    const target = await this.scopeResolver.resolveFromFormDefinitionId(version.formDefinitionId);
    this.scopeAuthorization.assertScope(actor, target);

    return this.dataSource.transaction(async (manager) => {
      const versionRepo = manager.getRepository(FormVersionEntity);

      const currentlyPublished = await versionRepo.findOneBy({
        formDefinitionId: version.formDefinitionId,
        isPublished: true,
      });
      if (currentlyPublished && currentlyPublished.id !== version.id) {
        currentlyPublished.isPublished = false;
        await versionRepo.save(currentlyPublished);
      }

      version.isPublished = true;
      const saved = await versionRepo.save(version);

      await this.auditService.record(manager, {
        actorUserId: actor.sub,
        action: 'FORM_VERSION_PUBLISHED',
        targetType: 'FORM_VERSION',
        targetId: saved.id,
        scopeType: 'COMMERCE',
        scopePortalId: null,
        scopeCommerceId: target.commerceId ?? null,
        newValue: { versionNumber: saved.versionNumber },
      });

      return toFormVersion(saved);
    });
  }

  async unpublish(id: string, actor: AuthenticatedRequestUser): Promise<FormVersion> {
    const version = await this.loadVersion(id);
    const target = await this.scopeResolver.resolveFromFormDefinitionId(version.formDefinitionId);
    this.scopeAuthorization.assertScope(actor, target);

    return this.dataSource.transaction(async (manager) => {
      version.isPublished = false;
      const saved = await manager.getRepository(FormVersionEntity).save(version);

      await this.auditService.record(manager, {
        actorUserId: actor.sub,
        action: 'FORM_VERSION_UNPUBLISHED',
        targetType: 'FORM_VERSION',
        targetId: saved.id,
        scopeType: 'COMMERCE',
        scopePortalId: null,
        scopeCommerceId: target.commerceId ?? null,
        previousValue: { versionNumber: saved.versionNumber },
      });

      return toFormVersion(saved);
    });
  }

  private async loadVersion(id: string): Promise<FormVersionEntity> {
    const version = await this.formVersionsRepository.findOneBy({ id });
    if (!version) {
      throw new NotFoundException(`FormVersion ${id} not found`);
    }
    return version;
  }
}
