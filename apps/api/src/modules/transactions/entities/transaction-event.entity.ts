import { TransactionEventSourceSchema, TransactionStatusSchema } from '@repo/contracts';
import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import type { z } from 'zod';

import { TransactionEntity } from './transaction.entity';

type TransactionStatus = z.infer<typeof TransactionStatusSchema>;
type TransactionEventSource = z.infer<typeof TransactionEventSourceSchema>;

/**
 * Append-only history of a Transaction's status changes
 * (docs/payments/TRANSACTION_LIFECYCLE.md §7, docs/adr/012). No
 * update/delete endpoint exists anywhere for this entity — matches
 * AuditEventEntity's pattern. `ON DELETE CASCADE`: an event has no meaning
 * independent of its transaction (same reasoning as FormFieldEntity →
 * FormVersionEntity).
 */
@Entity({ name: 'transaction_events' })
export class TransactionEventEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'transaction_id' })
  @Index()
  transactionId!: string;

  @ManyToOne(() => TransactionEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'transaction_id' })
  transaction!: TransactionEntity;

  @Column({ type: 'simple-enum', enum: TransactionStatusSchema.options, enumName: 'transaction_status', nullable: true })
  previousStatus!: TransactionStatus | null;

  @Column({ type: 'simple-enum', enum: TransactionStatusSchema.options, enumName: 'transaction_status' })
  newStatus!: TransactionStatus;

  @Column({ type: 'simple-enum', enum: TransactionEventSourceSchema.options, enumName: 'transaction_event_source' })
  source!: TransactionEventSource;

  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, unknown> | null;

  @CreateDateColumn()
  occurredAt!: Date;
}
