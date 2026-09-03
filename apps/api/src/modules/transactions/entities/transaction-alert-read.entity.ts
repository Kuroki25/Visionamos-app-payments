import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';

import { UserEntity } from '../../users/entities/user.entity';
import { TransactionEntity } from './transaction.entity';

/**
 * Per-user "read" marker for the Transacciones page's "Alertas" feed
 * (docs/frontend/DASHBOARD_SOURCE_OF_TRUTH.md §17.4 — master prompt
 * Slice 5). Deliberately NOT a full `Notification` table (id/audience/
 * type/title/message/...) — the alert's displayable content is always
 * derived live from its `TransactionEntity` (same as before this table
 * existed, `lib/transactions.ts`'s `toTxAlert`); only whether THIS user
 * has already seen it needs persisting. One row per (user, transaction)
 * marked read — absence of a row means unread. `ON DELETE CASCADE` on
 * both sides: a read marker has no meaning independent of its user or its
 * transaction.
 */
@Entity({ name: 'transaction_alert_reads' })
@Unique(['userId', 'transactionId'])
export class TransactionAlertReadEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'user_id' })
  @Index()
  userId!: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;

  @Column({ type: 'uuid', name: 'transaction_id' })
  @Index()
  transactionId!: string;

  @ManyToOne(() => TransactionEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'transaction_id' })
  transaction!: TransactionEntity;

  @CreateDateColumn({ name: 'read_at' })
  readAt!: Date;
}
