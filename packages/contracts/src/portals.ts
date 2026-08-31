import { z } from 'zod';

import { EntityStatusSchema } from './roles';

/**
 * `name` and its `UNIQUE` constraint are an assumed structural safeguard, not
 * a confirmed business rule (docs/business/BUSINESS_MODEL_RED_COOPAGOS.md
 * leaves Portal's field list undecided beyond the publish/activate
 * lifecycle) — documented in docs/adr/011, trivially reversible.
 */
export const CreatePortalSchema = z.object({
  name: z.string().min(1).max(200),
});
export type CreatePortal = z.infer<typeof CreatePortalSchema>;

export const UpdatePortalSchema = CreatePortalSchema.partial();
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
