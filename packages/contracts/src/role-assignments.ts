import { z } from 'zod';

import { RoleSchema, ScopeTypeSchema } from './roles';

/**
 * Mirrors the two `CHECK` constraints on the `role_assignments` table
 * (docs/adr/011-authorization-role-scope.md) as a Zod-level validation —
 * defense in depth, not a substitute for the database constraint. Shared
 * between `ReassignScopeSchema` below and `CreateUserSchema` (users.ts),
 * which embeds the same role+scope shape when creating a user.
 */
export function addRoleScopeChecks<
  T extends z.ZodType<{
    role: z.infer<typeof RoleSchema>;
    scopeType: z.infer<typeof ScopeTypeSchema>;
    scopePortalId?: string | null | undefined;
    scopeCommerceId?: string | null | undefined;
  }>,
>(schema: T) {
  return schema.superRefine((data, ctx) => {
    const { scopeType, scopePortalId, scopeCommerceId } = data;

    const scopeShapeValid =
      (scopeType === 'GLOBAL' && !scopePortalId && !scopeCommerceId) ||
      (scopeType === 'PORTAL' && !!scopePortalId && !scopeCommerceId) ||
      (scopeType === 'COMMERCE' && !!scopeCommerceId && !scopePortalId);
    if (!scopeShapeValid) {
      ctx.addIssue({
        code: 'custom',
        path: ['scopeType'],
        message:
          'GLOBAL requires no portal/commerce id; PORTAL requires scopePortalId only; COMMERCE requires scopeCommerceId only.',
      });
    }

    const roleScopeValid =
      (data.role === 'SUPERADMIN' && scopeType === 'GLOBAL') ||
      (data.role === 'ADMIN_PORTAL' && scopeType === 'PORTAL') ||
      (data.role === 'ADMIN_COMMERCE' && scopeType === 'COMMERCE') ||
      data.role === 'VIEWER';
    if (!roleScopeValid) {
      ctx.addIssue({
        code: 'custom',
        path: ['role'],
        message: 'SUPERADMIN requires GLOBAL, ADMIN_PORTAL requires PORTAL, ADMIN_COMMERCE requires COMMERCE.',
      });
    }
  });
}

const RoleAssignmentShapeSchema = z.object({
  role: RoleSchema,
  scopeType: ScopeTypeSchema,
  scopePortalId: z.uuid().nullable().optional(),
  scopeCommerceId: z.uuid().nullable().optional(),
});

/** Body of `PATCH /users/:userId/role-assignment` — SUPERADMIN only (ADR 011). */
export const ReassignScopeSchema = addRoleScopeChecks(RoleAssignmentShapeSchema);
export type ReassignScope = z.infer<typeof ReassignScopeSchema>;

export const RoleAssignmentSchema = z.object({
  id: z.uuid(),
  userId: z.uuid(),
  role: RoleSchema,
  scopeType: ScopeTypeSchema,
  scopePortalId: z.uuid().nullable(),
  scopeCommerceId: z.uuid().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export type RoleAssignment = z.infer<typeof RoleAssignmentSchema>;
