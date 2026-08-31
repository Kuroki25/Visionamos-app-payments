import { z } from 'zod';

import { EntityStatusSchema } from './roles';

/**
 * Comercio Aliado (docs/business/DOMAIN_GLOSSARY_RED_COOPAGOS.md §3.1).
 * `portalId` comes from the route (`/portals/:portalId/commerces`), not the
 * body. Deliberately **no** banking/settlement fields — that's a separate,
 * explicitly-pending concept ("SettlementAccount") kept out of this table
 * (docs/adr/011).
 */
export const CreateCommerceSchema = z.object({
  categoryId: z.uuid(),
  tradeName: z.string().min(1).max(200),
  legalName: z.string().min(1).max(200),
  taxId: z.string().min(1).max(50),
  contactName: z.string().min(1).max(200),
  contactEmail: z.email(),
  contactPhone: z.string().min(1).max(30),
  address: z.string().min(1).max(300),
  city: z.string().min(1).max(100),
});
export type CreateCommerce = z.infer<typeof CreateCommerceSchema>;

export const UpdateCommerceSchema = CreateCommerceSchema.partial();
export type UpdateCommerce = z.infer<typeof UpdateCommerceSchema>;

/** Body of `PATCH /commerces/:id/status` (docs/adr/011 §5). */
export const UpdateCommerceStatusSchema = z.object({
  status: EntityStatusSchema,
});
export type UpdateCommerceStatus = z.infer<typeof UpdateCommerceStatusSchema>;

export const CommerceSchema = z.object({
  id: z.uuid(),
  portalId: z.uuid(),
  categoryId: z.uuid(),
  tradeName: z.string(),
  legalName: z.string(),
  taxId: z.string(),
  contactName: z.string(),
  contactEmail: z.email(),
  contactPhone: z.string(),
  address: z.string(),
  city: z.string(),
  status: EntityStatusSchema,
  isPublished: z.boolean(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export type Commerce = z.infer<typeof CommerceSchema>;
