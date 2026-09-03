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
 *
 * `displayName`/`serviceType`/`description` — the user confirmed these as
 * real business fields (§17.2, reversing an earlier "not yet" decision),
 * required for every new Portal. `serviceType` is free text, not a
 * constrained enum: the reference image shows it as a dropdown, but no
 * confirmed set of categories exists in docs/business/ — see the entity's
 * own docblock. Logo is NOT here — it's uploaded separately via
 * `POST /portals/:id/logo` (needs the Portal's id first), see
 * `CreatePortalResponseSchema`/§17.2.
 */
export const CreatePortalSchema = z.object({
  name: z.string().min(1).max(200),
  displayName: z.string().min(1).max(200),
  serviceType: z.string().min(1).max(200),
  description: z.string().min(1).max(500),
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

/**
 * Nullable on the 3 fields the portal seeded before this pass (Avanza/
 * Otrahuilca/Coopenjo) never got, and always-nullable on `logoUrl` (logo
 * is genuinely optional even for a portal created after this pass).
 * `logoUrl` is a relative API path (`/portals/{id}/logo`), not an absolute
 * URL — the frontend prefixes it with `API_BASE_URL`, same as every other
 * API call (`lib/api/config.ts`).
 */
export const PortalSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  displayName: z.string().nullable(),
  serviceType: z.string().nullable(),
  description: z.string().nullable(),
  logoUrl: z.string().nullable(),
  status: EntityStatusSchema,
  isPublished: z.boolean(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export type Portal = z.infer<typeof PortalSchema>;

/**
 * Shared between `PortalForm.tsx` (client-side check, fast feedback) and
 * `PortalsService.uploadLogo` (the actual, authoritative check — the
 * client-side one is UX only, never trusted) — one source of truth for the
 * policy the reference image states: "PNG, JPG, WebP (máx. 5MB)"
 * (`06-portal-form-expected-bottom.png`).
 */
export const PORTAL_LOGO_MAX_BYTES = 5 * 1024 * 1024;
export const PORTAL_LOGO_ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const;
