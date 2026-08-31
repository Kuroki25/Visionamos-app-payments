import { z } from 'zod';

/**
 * The four fixed administrative roles of Red Coopagos
 * (docs/business/ROLE_PERMISSION_MATRIX.md §2). This is a closed set coupled
 * to code (guards, the role-creation matrix in ADR 011) — adding a role is an
 * architecture change requiring a migration (`ALTER TYPE ... ADD VALUE`), not
 * a business-configurable list. `.options` is imported directly by
 * apps/api's TypeORM `@Column({ enum: RoleSchema.options })` so the Postgres
 * enum and the Zod enum can never drift (docs/adr/011).
 */
export const RoleSchema = z.enum(['SUPERADMIN', 'ADMIN_PORTAL', 'ADMIN_COMMERCE', 'VIEWER']);
export type Role = z.infer<typeof RoleSchema>;

/** The organizational boundary a RoleAssignment's authority is limited to. */
export const ScopeTypeSchema = z.enum(['GLOBAL', 'PORTAL', 'COMMERCE']);
export type ScopeType = z.infer<typeof ScopeTypeSchema>;

/**
 * Shared activation lifecycle for Portal/Commerce/FormVersion/User
 * (docs/adr/011) — one Postgres enum type, reused across tables rather than
 * one per table.
 */
export const EntityStatusSchema = z.enum(['ACTIVE', 'INACTIVE']);
export type EntityStatus = z.infer<typeof EntityStatusSchema>;
