import { RoleSchema, ScopeTypeSchema } from '@repo/contracts';
import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { z } from 'zod';

import { CommerceEntity } from '../../commerces/entities/commerce.entity';
import { PortalEntity } from '../../portals/entities/portal.entity';
import { UserEntity } from '../../users/entities/user.entity';

type Role = z.infer<typeof RoleSchema>;
type ScopeType = z.infer<typeof ScopeTypeSchema>;

/**
 * A user's current role + organizational scope
 * (docs/adr/011-authorization-role-scope.md). One row per user
 * (`OneToOne` on `user` makes `user_id` unique automatically) — this table
 * holds *state*, not history: "un único scope operativo activo a la vez"
 * (docs/business/ROLE_PERMISSION_MATRIX.md §7). Reassigning a scope is an
 * `UPDATE` of this row inside a transaction, not a new row; the history of
 * who had what scope and when it changed lives in AuditEventEntity
 * (`previousValue`/`newValue`), not here.
 *
 * `ON DELETE CASCADE` on `user` is the one deliberate exception to
 * "RESTRICT by default" in this module: this row has no meaning independent
 * of its user, the same way a profile row is owned by its parent.
 *
 * The two `CHECK`s mirror `addRoleScopeChecks` in
 * packages/contracts/src/role-assignments.ts (defense in depth, not a
 * substitute — Zod validates first, the database is the final backstop).
 */
@Entity({ name: 'role_assignments' })
@Check(
  `("scope_type" = 'GLOBAL' AND "scope_portal_id" IS NULL AND "scope_commerce_id" IS NULL)
    OR ("scope_type" = 'PORTAL' AND "scope_portal_id" IS NOT NULL AND "scope_commerce_id" IS NULL)
    OR ("scope_type" = 'COMMERCE' AND "scope_commerce_id" IS NOT NULL AND "scope_portal_id" IS NULL)`,
)
@Check(
  `("role" = 'SUPERADMIN' AND "scope_type" = 'GLOBAL')
    OR ("role" = 'ADMIN_PORTAL' AND "scope_type" = 'PORTAL')
    OR ("role" = 'ADMIN_COMMERCE' AND "scope_type" = 'COMMERCE')
    OR ("role" = 'VIEWER')`,
)
export class RoleAssignmentEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId!: string;

  @OneToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;

  @Column({ type: 'simple-enum', enum: RoleSchema.options, enumName: 'role' })
  role!: Role;

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

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
