import { AuditActionSchema, AuditTargetTypeSchema, ScopeTypeSchema } from '@repo/contracts';
import { Check, Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import type { z } from 'zod';

import { CommerceEntity } from '../../commerces/entities/commerce.entity';
import { PortalEntity } from '../../portals/entities/portal.entity';
import { UserEntity } from '../../users/entities/user.entity';

type AuditAction = z.infer<typeof AuditActionSchema>;
type AuditTargetType = z.infer<typeof AuditTargetTypeSchema>;
type ScopeType = z.infer<typeof ScopeTypeSchema>;

/**
 * Append-only administrative audit trail (BR-046 —
 * docs/business/BUSINESS_RULES_RED_COOPAGOS.md §11). No `updatedAt`, no
 * update/delete endpoint exists for this entity anywhere in the API.
 *
 * `targetId` deliberately has **no** foreign key: it's polymorphic — it
 * points at whichever table `targetType` names (User, RoleAssignment,
 * Portal, Commerce, FormVersion) — and a single physical FK column cannot
 * reference five different tables. Enforcing that via triggers would be
 * disproportionate for a log whose job is "record what happened", not
 * "guarantee the target still exists".
 *
 * `actorUserId` IS a real FK (`ON DELETE RESTRICT`) — the "who" of an audit
 * trail must never be lose-able by deleting a user (in practice users are
 * only ever deactivated, never deleted, but the constraint documents the
 * invariant regardless).
 */
@Entity({ name: 'audit_events' })
@Index(['targetType', 'targetId'])
@Check(
  `("scope_type" = 'GLOBAL' AND "scope_portal_id" IS NULL AND "scope_commerce_id" IS NULL)
    OR ("scope_type" = 'PORTAL' AND "scope_portal_id" IS NOT NULL AND "scope_commerce_id" IS NULL)
    OR ("scope_type" = 'COMMERCE' AND "scope_commerce_id" IS NOT NULL AND "scope_portal_id" IS NULL)`,
)
export class AuditEventEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'actor_user_id' })
  @Index()
  actorUserId!: string;

  @ManyToOne(() => UserEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'actor_user_id' })
  actorUser!: UserEntity;

  @Column({ type: 'simple-enum', enum: AuditActionSchema.options, enumName: 'audit_action' })
  action!: AuditAction;

  // No standalone @Index() here — the composite (targetType, targetId) index
  // above covers lookups filtered by targetType alone too (leftmost prefix).
  @Column({ type: 'simple-enum', enum: AuditTargetTypeSchema.options, enumName: 'audit_target_type' })
  targetType!: AuditTargetType;

  @Column({ type: 'uuid', name: 'target_id' })
  targetId!: string;

  @Column({ type: 'simple-enum', enum: ScopeTypeSchema.options, enumName: 'scope_type' })
  scopeType!: ScopeType;

  @Column({ type: 'uuid', name: 'scope_portal_id', nullable: true })
  @Index()
  scopePortalId!: string | null;

  @ManyToOne(() => PortalEntity, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({ name: 'scope_portal_id' })
  scopePortal!: PortalEntity | null;

  @Column({ type: 'uuid', name: 'scope_commerce_id', nullable: true })
  @Index()
  scopeCommerceId!: string | null;

  @ManyToOne(() => CommerceEntity, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({ name: 'scope_commerce_id' })
  scopeCommerce!: CommerceEntity | null;

  @Column({ type: 'jsonb', nullable: true })
  previousValue!: Record<string, unknown> | null;

  @Column({ type: 'jsonb', nullable: true })
  newValue!: Record<string, unknown> | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, unknown> | null;

  @Index()
  @CreateDateColumn()
  createdAt!: Date;
}
