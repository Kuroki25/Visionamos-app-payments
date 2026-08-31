import { EntityStatusSchema } from '@repo/contracts';
import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from 'typeorm';
import type { z } from 'zod';

import { FormDefinitionEntity } from './form-definition.entity';

type EntityStatus = z.infer<typeof EntityStatusSchema>;

/**
 * A versioned snapshot of a FormDefinition
 * (docs/business/DOMAIN_GLOSSARY_RED_COOPAGOS.md §8.3) — preserves the
 * historical meaning of a FormSubmission even after the form is edited.
 *
 * The partial unique index below is the database *enforcing* "at most one
 * published version per definition" — not just something the service layer
 * is trusted to maintain. Publishing a new version must unpublish the
 * previous one transactionally (FormVersionsService), and this index makes
 * a bug that skips that step fail loudly instead of silently producing two
 * "live" versions.
 */
@Entity({ name: 'form_versions' })
@Unique(['formDefinitionId', 'versionNumber'])
@Index('ux_form_versions_one_published', ['formDefinitionId'], { unique: true, where: '"is_published" = true' })
export class FormVersionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'form_definition_id' })
  @Index()
  formDefinitionId!: string;

  @ManyToOne(() => FormDefinitionEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'form_definition_id' })
  formDefinition!: FormDefinitionEntity;

  @Column({ type: 'integer' })
  versionNumber!: number;

  @Column({ type: 'simple-enum', enum: EntityStatusSchema.options, enumName: 'entity_status', default: 'ACTIVE' })
  status!: EntityStatus;

  @Column({ type: 'boolean', default: false })
  isPublished!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
