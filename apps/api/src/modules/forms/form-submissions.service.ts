import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { CreateFormSubmission, FormSubmission } from '@repo/contracts';
import type { Repository } from 'typeorm';

import type { AuthenticatedRequestUser } from '../auth/types/authenticated-request-user.type';
import { ScopeAuthorizationService } from '../role-assignments/scope-authorization.service';
import { FormFieldEntity } from './entities/form-field.entity';
import { FormSubmissionEntity } from './entities/form-submission.entity';
import { FormVersionEntity } from './entities/form-version.entity';
import { FormScopeResolverService } from './form-scope-resolver.service';

function toFormSubmission(entity: FormSubmissionEntity): FormSubmission {
  return {
    id: entity.id,
    formVersionId: entity.formVersionId,
    answers: entity.answers,
    createdAt: entity.createdAt.toISOString(),
  };
}

/**
 * Administrative capture (docs/adr — this phase's forms module has no
 * public/anonymous submission endpoint yet, see forms.module.ts docblock).
 * No audit event: routine data capture isn't a "critical administrative
 * action" in the sense BR-046 means (state changes, role/scope changes) —
 * docs/adr/011 §1.
 */
@Injectable()
export class FormSubmissionsService {
  constructor(
    @InjectRepository(FormSubmissionEntity)
    private readonly submissionsRepository: Repository<FormSubmissionEntity>,
    @InjectRepository(FormVersionEntity)
    private readonly formVersionsRepository: Repository<FormVersionEntity>,
    @InjectRepository(FormFieldEntity)
    private readonly formFieldsRepository: Repository<FormFieldEntity>,
    private readonly scopeAuthorization: ScopeAuthorizationService,
    private readonly scopeResolver: FormScopeResolverService,
  ) {}

  async create(formVersionId: string, actor: AuthenticatedRequestUser, input: CreateFormSubmission): Promise<FormSubmission> {
    const target = await this.scopeResolver.resolveFromFormVersionId(formVersionId);
    this.scopeAuthorization.assertScope(actor, target);

    const version = await this.formVersionsRepository.findOneBy({ id: formVersionId });
    if (!version) {
      throw new NotFoundException(`FormVersion ${formVersionId} not found`);
    }
    if (!version.isPublished) {
      throw new ConflictException('Cannot submit against a form version that is not published.');
    }

    const fields = await this.formFieldsRepository.find({ where: { formVersionId } });
    this.assertAnswersSatisfyFields(fields, input.answers);

    const saved = await this.submissionsRepository.save(
      this.submissionsRepository.create({ formVersionId, answers: input.answers }),
    );
    return toFormSubmission(saved);
  }

  async findAllForVersion(formVersionId: string, actor: AuthenticatedRequestUser): Promise<FormSubmission[]> {
    const target = await this.scopeResolver.resolveFromFormVersionId(formVersionId);
    this.scopeAuthorization.assertScope(actor, target);

    const submissions = await this.submissionsRepository.find({
      where: { formVersionId },
      order: { createdAt: 'DESC' },
    });
    return submissions.map(toFormSubmission);
  }

  /** Required fields must be present and non-empty; a SELECT's value (when provided) must be one of its configured options. Not a replacement for the CreateFormFieldSchema/CHECK invariants — those guard the field definition, this guards the submitted values against it. */
  private assertAnswersSatisfyFields(fields: FormFieldEntity[], answers: Record<string, unknown>): void {
    const errors: string[] = [];

    for (const field of fields) {
      const value = answers[field.key];
      const isEmpty = value === undefined || value === null || value === '';

      if (field.isRequired && isEmpty) {
        errors.push(`Field "${field.key}" is required.`);
        continue;
      }
      if (isEmpty) {
        continue;
      }
      if (field.type === 'SELECT' && field.options) {
        const allowedValues = field.options.map((option) => option.value);
        if (typeof value !== 'string' || !allowedValues.includes(value)) {
          errors.push(`Field "${field.key}" must be one of: ${allowedValues.join(', ')}.`);
        }
      }
    }

    if (errors.length > 0) {
      throw new BadRequestException(errors.join(' '));
    }
  }
}
