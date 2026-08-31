import { PaymentMethodSchema, TransactionStatusSchema } from '@repo/contracts';
import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from 'typeorm';
import type { z } from 'zod';

import { CommerceEntity } from '../../commerces/entities/commerce.entity';
import { PortalEntity } from '../../portals/entities/portal.entity';
import { ServiceEntity } from '../../services/entities/service.entity';
import { FormSubmissionEntity } from '../../forms/entities/form-submission.entity';

type PaymentMethod = z.infer<typeof PaymentMethodSchema>;
type TransactionStatus = z.infer<typeof TransactionStatusSchema>;

/**
 * A payment operation (docs/business/DOMAIN_GLOSSARY_RED_COOPAGOS.md §10.1).
 * Deliberately minimal scope — see docs/adr/012-transactions-minimal-scope.md
 * for every assumption made here (currency, integer minor-unit amount,
 * flat PaymentMethod enum, payer snapshot instead of a PayerData entity, no
 * PaymentObligation/PaymentIntent).
 *
 * `portalId`/`commerceId` are cached from `service → commerce → portal`
 * (`ON DELETE RESTRICT`, same pattern as `RoleAssignmentEntity`) so scoped
 * admin queries don't need a 3-way join through `services`/`commerces` for
 * every list/filter.
 *
 * No `status`/`amount` column here is ever written by an admin endpoint —
 * only `TransactionsService.applyTransition` (internal), which validates
 * against the state machine in docs/adr/012 and always logs a
 * TransactionEventEntity alongside the change.
 */
@Entity({ name: 'transactions' })
@Unique(['internalReference'])
export class TransactionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'portal_id' })
  @Index()
  portalId!: string;

  @ManyToOne(() => PortalEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'portal_id' })
  portal!: PortalEntity;

  @Column({ type: 'uuid', name: 'commerce_id' })
  @Index()
  commerceId!: string;

  @ManyToOne(() => CommerceEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'commerce_id' })
  commerce!: CommerceEntity;

  @Column({ type: 'uuid', name: 'service_id' })
  @Index()
  serviceId!: string;

  @ManyToOne(() => ServiceEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'service_id' })
  service!: ServiceEntity;

  @Column({ type: 'uuid', name: 'form_submission_id', nullable: true })
  formSubmissionId!: string | null;

  @ManyToOne(() => FormSubmissionEntity, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({ name: 'form_submission_id' })
  formSubmission!: FormSubmissionEntity | null;

  // Payer snapshot, not a reusable Payer entity — docs/adr/012.
  @Column({ type: 'varchar', length: 320 })
  payerEmail!: string;

  @Column({ type: 'varchar', length: 50 })
  payerDocumentType!: string;

  @Column({ type: 'varchar', length: 50 })
  payerDocumentNumber!: string;

  @Column({ type: 'varchar', length: 200 })
  payerFirstName!: string;

  @Column({ type: 'varchar', length: 200 })
  payerLastName!: string;

  @Column({ type: 'varchar', length: 30 })
  payerPhone!: string;

  // Minor currency units (centavos) — avoids floating-point money, the de
  // facto standard (Stripe et al.), not a business-confirmed decision.
  @Column({ type: 'integer' })
  amount!: number;

  @Column({ type: 'varchar', length: 3, default: 'COP' })
  currency!: string;

  @Column({ type: 'simple-enum', enum: PaymentMethodSchema.options, enumName: 'payment_method' })
  method!: PaymentMethod;

  @Column({ type: 'simple-enum', enum: TransactionStatusSchema.options, enumName: 'transaction_status', default: 'CREATED' })
  @Index()
  status!: TransactionStatus;

  @Column({ type: 'varchar', length: 100 })
  internalReference!: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  providerReference!: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
