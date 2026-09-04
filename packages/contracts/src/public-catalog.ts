import { z } from 'zod';

import { PaginationQuerySchema, paginatedSchema } from './pagination';

/**
 * Public, unauthenticated projection of Portal — deliberately its own type,
 * not a reuse of `Portal` (portals.ts). Portal-web's master prompt §61 is
 * explicit: an admin DTO must never be handed to a public/anonymous
 * consumer directly. This omits `status`/`isPublished`/`createdAt`/
 * `updatedAt` on purpose — a Portal only ever appears through this schema
 * when it is already published+active (`PublicCatalogService`), so those
 * fields would be redundant, and `createdAt`/`updatedAt` are internal
 * housekeeping, not public information.
 */
export const PublicPortalSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  displayName: z.string().nullable(),
  serviceType: z.string().nullable(),
  description: z.string().nullable(),
  logoUrl: z.string().nullable(),
});
export type PublicPortal = z.infer<typeof PublicPortalSchema>;

/** `GET /public/portals` query — `q` searches `Portal.name` (ILIKE, §54: length-capped, never interpolated raw into SQL). */
export const PublicPortalsQuerySchema = PaginationQuerySchema.extend({
  q: z.string().trim().max(200).optional(),
});
export type PublicPortalsQuery = z.infer<typeof PublicPortalsQuerySchema>;

export const PublicPortalsResponseSchema = paginatedSchema(PublicPortalSchema);
export type PublicPortalsResponse = z.infer<typeof PublicPortalsResponseSchema>;

/**
 * Public projection of Commerce, denormalized with just enough of its
 * Portal/Category to point a visitor at the right place (master prompt
 * §15: "el resultado debe llevar al usuario al portal correcto") without a
 * second round-trip. Never the admin fields (`legalName`, `taxId`,
 * `contactEmail`, `contactPhone`, `address` — §27: "no exponer ... datos
 * sensibles").
 */
export const PublicCommerceSchema = z.object({
  id: z.uuid(),
  tradeName: z.string(),
  portalId: z.uuid(),
  portalName: z.string(),
  categoryId: z.uuid(),
  categoryName: z.string(),
});
export type PublicCommerce = z.infer<typeof PublicCommerceSchema>;

/** `GET /public/commerces` query — `q` searches `Commerce.tradeName`; `portalId`/`categoryId` narrow a portal's own directory (future Portal detail page). */
export const PublicCommercesQuerySchema = PaginationQuerySchema.extend({
  q: z.string().trim().max(200).optional(),
  portalId: z.uuid().optional(),
  categoryId: z.uuid().optional(),
});
export type PublicCommercesQuery = z.infer<typeof PublicCommercesQuerySchema>;

export const PublicCommercesResponseSchema = paginatedSchema(PublicCommerceSchema);
export type PublicCommercesResponse = z.infer<typeof PublicCommercesResponseSchema>;
