import { EntityStatusSchema } from '@repo/contracts';
import { Column, CreateDateColumn, Entity, PrimaryColumn, Unique, UpdateDateColumn } from 'typeorm';
import type { z } from 'zod';

type EntityStatus = z.infer<typeof EntityStatusSchema>;

/**
 * The "AppUser" of docs/business/DOMAIN_GLOSSARY_RED_COOPAGOS.md §4.1 —
 * exclusively an administrative Backoffice account. Never represents the
 * public Cliente/Pagador, who has no account in this phase (BR-008).
 *
 * `role` used to live directly on this table (single flat role). It now
 * lives in RoleAssignmentEntity instead (docs/adr/011) — a user has at most
 * one active role+scope assignment, modeled as its own row rather than a
 * column here, so authorization data isn't mixed with identity data.
 *
 * Since the Better Auth cutover (docs/adr/013-better-auth-migration.md),
 * this is a *profile* table, not an identity table: `id` is no longer
 * self-generated (`@PrimaryColumn`, not `@PrimaryGeneratedColumn`) — every
 * caller must pass the same `id` as the matching Better Auth `user` row
 * (`FOREIGN KEY (id) REFERENCES "user"(id)`, migration
 * `AlterUsersForBetterAuthCutover`), created first in the same transaction
 * via `createBetterAuthIdentity`. `password_hash` is gone — Better Auth
 * owns the credential now (`account.password`).
 */
@Entity({ name: 'users' })
@Unique(['email'])
export class UserEntity {
  @PrimaryColumn({ type: 'uuid' })
  id!: string;

  @Column({ type: 'varchar', length: 320 })
  email!: string;

  @Column({ type: 'varchar', length: 200 })
  fullName!: string;

  @Column({ type: 'simple-enum', enum: EntityStatusSchema.options, enumName: 'entity_status', default: 'ACTIVE' })
  status!: EntityStatus;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
