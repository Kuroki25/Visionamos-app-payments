import { z } from 'zod';

import { EntityStatusSchema } from './roles';

/**
 * `name` and its `UNIQUE` constraint are an assumed structural safeguard, not
 * a confirmed business rule (docs/business/BUSINESS_MODEL_RED_COOPAGOS.md
 * leaves Portal's field list undecided beyond the publish/activate
 * lifecycle) — documented in docs/adr/011, trivially reversible.
 *
 * `status` is optional and defaults to `ACTIVE` (the entity's own DB
 * default) — lets the create form expose the "Portal activo" toggle from
 * `docs/frontend/references/06-portal-form-expected-bottom.png` without a
 * second round-trip to `PATCH /portals/:id/status`
 * (docs/frontend/DASHBOARD_SOURCE_OF_TRUTH.md §17.5, `MAPPING_REQUIRED`).
 * The other fields that image shows (displayName/serviceType/description/
 * logo) are deliberately NOT here — confirmed `BACKEND_GAP` without a
 * business decision, see the same §17.5 row.
 */
export const CreatePortalSchema = z.object({
  name: z.string().min(1).max(200),
  status: EntityStatusSchema.optional(),
});
export type CreatePortal = z.infer<typeof CreatePortalSchema>;

/**
 * Deliberately omits `status` even though `CreatePortalSchema` has it —
 * `PATCH /portals/:id/status` is the only path allowed to change it
 * (`UpdatePortalStatusSchema` below), because that's the one that audits
 * `PORTAL_ACTIVATED`/`PORTAL_DEACTIVATED` (`PortalsService.updateStatus`).
 * Letting a plain edit smuggle `status` through would silently bypass that
 * audit trail.
 */
export const UpdatePortalSchema = CreatePortalSchema.omit({ status: true }).partial();
export type UpdatePortal = z.infer<typeof UpdatePortalSchema>;

/** Body of `PATCH /portals/:id/status` (docs/adr/011 §5). */
export const UpdatePortalStatusSchema = z.object({
  status: EntityStatusSchema,
});
export type UpdatePortalStatus = z.infer<typeof UpdatePortalStatusSchema>;

export const PortalSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  status: EntityStatusSchema,
  isPublished: z.boolean(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export type Portal = z.infer<typeof PortalSchema>;
