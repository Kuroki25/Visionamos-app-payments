import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { CreateFormField, FormField, UpdateFormField } from '@repo/contracts';
import type { Repository } from 'typeorm';

import type { AuthenticatedRequestUser } from '../auth/types/authenticated-request-user.type';
import { ScopeAuthorizationService } from '../role-assignments/scope-authorization.service';
import { FormFieldEntity } from './entities/form-field.entity';
import { FormVersionEntity } from './entities/form-version.entity';
import { FormScopeResolverService } from './form-scope-resolver.service';

function toFormField(entity: FormFieldEntity): FormField {
  return {
    id: entity.id,
    formVersionId: entity.formVersionId,
    key: entity.key,
    label: entity.label,
    type: entity.type,
    isRequired: entity.isRequired,
    sortOrder: entity.sortOrder,
    options: entity.options,
    validationRules: entity.validationRules,
    createdAt: entity.createdAt.toISOString(),
    updatedAt: entity.updatedAt.toISOString(),
  };
}

/** A published FormVersion is immutable — versioning only means something if a published snapshot can't change under submissions already captured against it. */
@Injectable()
export class FormFieldsService {
  constructor(
    @InjectRepository(FormFieldEntity)
    private readonly formFieldsRepository: Repository<FormFieldEntity>,
    @InjectRepository(FormVersionEntity)
    private readonly formVersionsRepository: Repository<FormVersionEntity>,
    private readonly scopeAuthorization: ScopeAuthorizationService,
    private readonly scopeResolver: FormScopeResolverService,
  ) {}

  async create(formVersionId: string, actor: AuthenticatedRequestUser, input: CreateFormField): Promise<FormField> {
    const version = await this.assertEditableVersion(formVersionId, actor);
    const saved = await this.formFieldsRepository.save(
      this.formFieldsRepository.create({ ...input, formVersionId: version.id, options: input.options ?? null, validationRules: input.validationRules ?? null }),
    );
    return toFormField(saved);
  }

  async findAllForVersion(formVersionId: string, actor: AuthenticatedRequestUser): Promise<FormField[]> {
    const target = await this.scopeResolver.resolveFromFormVersionId(formVersionId);
    this.scopeAuthorization.assertScope(actor, target);

    const fields = await this.formFieldsRepository.find({ where: { formVersionId }, order: { sortOrder: 'ASC' } });
    return fields.map(toFormField);
  }

  async update(fieldId: string, actor: AuthenticatedRequestUser, input: UpdateFormField): Promise<FormField> {
    const field = await this.loadField(fieldId);
    await this.assertEditableVersion(field.formVersionId, actor);

    Object.assign(field, input);
    const saved = await this.formFieldsRepository.save(field);
    return toFormField(saved);
  }

  async remove(fieldId: string, actor: AuthenticatedRequestUser): Promise<void> {
    const field = await this.loadField(fieldId);
    await this.assertEditableVersion(field.formVersionId, actor);
    await this.formFieldsRepository.remove(field);
  }

  private async loadField(id: string): Promise<FormFieldEntity> {
    const field = await this.formFieldsRepository.findOneBy({ id });
    if (!field) {
      throw new NotFoundException(`FormField ${id} not found`);
    }
    return field;
  }

  private async assertEditableVersion(formVersionId: string, actor: AuthenticatedRequestUser): Promise<FormVersionEntity> {
    const target = await this.scopeResolver.resolveFromFormVersionId(formVersionId);
    this.scopeAuthorization.assertScope(actor, target);

    const version = await this.formVersionsRepository.findOneBy({ id: formVersionId });
    if (!version) {
      throw new NotFoundException(`FormVersion ${formVersionId} not found`);
    }
    if (version.isPublished) {
      throw new ConflictException('A published form version is immutable — create a new version instead.');
    }
    return version;
  }
}
