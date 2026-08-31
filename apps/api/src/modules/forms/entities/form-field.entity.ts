import { FormFieldTypeSchema } from '@repo/contracts';
import { Check, Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from 'typeorm';
import type { z } from 'zod';

import { FormVersionEntity } from './form-version.entity';

type FormFieldType = z.infer<typeof FormFieldTypeSchema>;

interface FormFieldOption {
  value: string;
  label: string;
}

/**
 * A configurable field within a FormVersion
 * (docs/business/DOMAIN_GLOSSARY_RED_COOPAGOS.md §8.2). `ON DELETE CASCADE`
 * (unlike every other FK in this module, which is RESTRICT): a field has no
 * value independent of its version — deleting a draft version's fields
 * along with it is correct, not a data-loss risk (a *published*, submitted-
 * against version is never deleted, only unpublished).
 *
 * The `CHECK` mirrors `CreateFormFieldSchema`'s Zod `.refine()`
 * (packages/contracts/src/forms.ts) — a SELECT field without options is an
 * invalid state, rejected at both layers (defense in depth).
 */
@Entity({ name: 'form_fields' })
@Unique(['formVersionId', 'key'])
@Check(`"type" <> 'SELECT' OR "options" IS NOT NULL`)
export class FormFieldEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'form_version_id' })
  @Index()
  formVersionId!: string;

  @ManyToOne(() => FormVersionEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'form_version_id' })
  formVersion!: FormVersionEntity;

  @Column({ type: 'varchar', length: 100 })
  key!: string;

  @Column({ type: 'varchar', length: 200 })
  label!: string;

  @Column({ type: 'simple-enum', enum: FormFieldTypeSchema.options, enumName: 'form_field_type' })
  type!: FormFieldType;

  @Column({ type: 'boolean', default: false })
  isRequired!: boolean;

  @Index()
  @Column({ type: 'integer', default: 0 })
  sortOrder!: number;

  @Column({ type: 'jsonb', nullable: true })
  options!: FormFieldOption[] | null;

  @Column({ type: 'jsonb', nullable: true })
  validationRules!: Record<string, unknown> | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
