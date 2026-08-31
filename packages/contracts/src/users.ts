import { z } from 'zod';

import { EntityStatusSchema, RoleSchema, ScopeTypeSchema } from './roles';

// Length bounds follow NIST SP 800-63B: enforce length, not forced
// composition rules (uppercase/symbol/etc. requirements are explicitly
// discouraged there and tend to push users toward predictable patterns).
// Moved here from auth.ts — password policy conceptually belongs to user
// creation, not login (login just checks a non-empty string).
export const PasswordSchema = z
  .string()
  .min(12, 'La contraseña debe tener al menos 12 caracteres.')
  .max(128, 'La contraseña no puede superar los 128 caracteres.');

/**
 * There is no public self-registration in Red Coopagos (docs/adr/006/011) —
 * every `AppUser` is created by an already-authenticated SUPERADMIN,
 * ADMIN_PORTAL or ADMIN_COMMERCE via `POST /users`, subject to the
 * role-creation matrix in docs/adr/011-authorization-role-scope.md. Unlike
 * `ReassignScopeSchema` (role-assignments.ts), the caller does NOT send an
 * explicit `scopeType` — it's derived server-side from `role` (and, for
 * VIEWER, from which of `scopePortalId`/`scopeCommerceId` is present) so a
 * client can't submit an inconsistent `role`/`scopeType` pair.
 */
export const CreateUserSchema = z
  .object({
    email: z.email(),
    password: PasswordSchema,
    fullName: z.string().min(1).max(200),
    role: RoleSchema,
    scopePortalId: z.uuid().nullable().optional(),
    scopeCommerceId: z.uuid().nullable().optional(),
  })
  .superRefine((data, ctx) => {
    const hasPortal = Boolean(data.scopePortalId);
    const hasCommerce = Boolean(data.scopeCommerceId);

    if (hasPortal && hasCommerce) {
      ctx.addIssue({
        code: 'custom',
        path: ['scopeCommerceId'],
        message: 'Provide at most one of scopePortalId or scopeCommerceId.',
      });
      return;
    }

    if (data.role === 'SUPERADMIN' && (hasPortal || hasCommerce)) {
      ctx.addIssue({ code: 'custom', path: ['role'], message: 'SUPERADMIN cannot have a portal/commerce scope.' });
    }
    if (data.role === 'ADMIN_PORTAL' && !hasPortal) {
      ctx.addIssue({ code: 'custom', path: ['scopePortalId'], message: 'ADMIN_PORTAL requires scopePortalId.' });
    }
    if (data.role === 'ADMIN_COMMERCE' && !hasCommerce) {
      ctx.addIssue({ code: 'custom', path: ['scopeCommerceId'], message: 'ADMIN_COMMERCE requires scopeCommerceId.' });
    }
    // VIEWER: hasPortal xor hasCommerce xor neither (defaults to GLOBAL) — every combination but "both" is valid.
  });
export type CreateUser = z.infer<typeof CreateUserSchema>;

/**
 * Role/scope no longer change through this endpoint — that's
 * `PATCH /users/:userId/role-assignment` (ReassignScopeSchema,
 * role-assignments.ts, SUPERADMIN-only). This is deliberately narrow.
 */
export const UpdateUserSchema = z.object({
  fullName: z.string().min(1).max(200),
});
export type UpdateUser = z.infer<typeof UpdateUserSchema>;

/** Body of `PATCH /users/:id/status` — activate/deactivate (docs/adr/011 §5). */
export const UpdateUserStatusSchema = z.object({
  status: EntityStatusSchema,
});
export type UpdateUserStatus = z.infer<typeof UpdateUserStatusSchema>;

export const UserSchema = z.object({
  id: z.uuid(),
  email: z.email(),
  fullName: z.string(),
  role: RoleSchema,
  scopeType: ScopeTypeSchema,
  scopePortalId: z.uuid().nullable(),
  scopeCommerceId: z.uuid().nullable(),
  status: EntityStatusSchema,
  createdAt: z.iso.datetime(),
});
export type User = z.infer<typeof UserSchema>;
