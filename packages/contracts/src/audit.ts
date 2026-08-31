import { z } from 'zod';

import { ScopeTypeSchema } from './roles';

/**
 * Closed set of auditable administrative actions (BR-046 —
 * docs/business/BUSINESS_RULES_RED_COOPAGOS.md §11). Commerce mirrors
 * Portal's four lifecycle actions; extend this enum (with a migration) when
 * a new critical action is added, don't repurpose an existing value.
 */
export const AuditActionSchema = z.enum([
  'USER_CREATED',
  'USER_ACTIVATED',
  'USER_DEACTIVATED',
  'ROLE_REASSIGNED',
  'PORTAL_ACTIVATED',
  'PORTAL_DEACTIVATED',
  'PORTAL_PUBLISHED',
  'PORTAL_UNPUBLISHED',
  'COMMERCE_ACTIVATED',
  'COMMERCE_DEACTIVATED',
  'COMMERCE_PUBLISHED',
  'COMMERCE_UNPUBLISHED',
  'FORM_VERSION_PUBLISHED',
  'FORM_VERSION_UNPUBLISHED',
]);
export type AuditAction = z.infer<typeof AuditActionSchema>;

export const AuditTargetTypeSchema = z.enum(['USER', 'ROLE_ASSIGNMENT', 'PORTAL', 'COMMERCE', 'FORM_VERSION']);
export type AuditTargetType = z.infer<typeof AuditTargetTypeSchema>;

/**
 * `targetId` deliberately has no foreign key at the database level — it's
 * polymorphic (points at one of five different tables depending on
 * `targetType`), and a single physical FK can't reference multiple tables
 * (docs/adr/011). Append-only: no update/delete endpoint exists for this
 * resource.
 */
export const AuditEventSchema = z.object({
  id: z.uuid(),
  actorUserId: z.uuid(),
  action: AuditActionSchema,
  targetType: AuditTargetTypeSchema,
  targetId: z.uuid(),
  scopeType: ScopeTypeSchema,
  scopePortalId: z.uuid().nullable(),
  scopeCommerceId: z.uuid().nullable(),
  previousValue: z.record(z.string(), z.unknown()).nullable(),
  newValue: z.record(z.string(), z.unknown()).nullable(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  createdAt: z.iso.datetime(),
});
export type AuditEvent = z.infer<typeof AuditEventSchema>;
