import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

import { FormVersionEntity } from './form-version.entity';

/**
 * Values captured for a FormVersion (docs/business/DOMAIN_GLOSSARY_RED_COOPAGOS.md
 * §8.4).
 *
 * Deliberately **no** `transactionId` here, even though a Transaction may
 * be linked to the submission that preceded it
 * (docs/business/DOMAIN_RELATIONSHIPS.md: "FormSubmission 1 — 0..1
 * Transaction") — that link lives as `TransactionEntity.formSubmissionId`
 * instead (docs/adr/012), set once at Transaction creation time. Putting it
 * here too would mean updating a submission row after the fact (once its
 * transaction exists), which breaks the immutability this entity is
 * designed around (no `updatedAt`, "a submission is immutable once
 * created" — see below) and would let the two columns disagree with each
 * other with no constraint preventing it.
 *
 * `ON DELETE RESTRICT`: a submission is captured data with real business
 * value, must never disappear because its version was touched. No
 * `updatedAt` — a submission is immutable once created.
 */
@Entity({ name: 'form_submissions' })
export class FormSubmissionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'form_version_id' })
  @Index()
  formVersionId!: string;

  @ManyToOne(() => FormVersionEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'form_version_id' })
  formVersion!: FormVersionEntity;

  @Column({ type: 'jsonb' })
  answers!: Record<string, unknown>;

  @CreateDateColumn()
  createdAt!: Date;
}
