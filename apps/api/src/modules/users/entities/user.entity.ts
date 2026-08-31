import { EntityStatusSchema } from '@repo/contracts';
import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from 'typeorm';
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
 */
@Entity({ name: 'users' })
@Unique(['email'])
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 320 })
  email!: string;

  @Column({ type: 'varchar', length: 200 })
  fullName!: string;

  // select: false — never returned by a plain find()/findOneBy(); a query
  // must explicitly opt in (see AuthService.validateCredentials), so a
  // developer can't accidentally serialize the hash into an API response.
  @Column({ type: 'varchar', length: 255, select: false })
  passwordHash!: string;

  @Column({ type: 'simple-enum', enum: EntityStatusSchema.options, enumName: 'entity_status', default: 'ACTIVE' })
  status!: EntityStatus;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
