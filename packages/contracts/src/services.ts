import { z } from 'zod';

/**
 * A payable concept offered by a Commerce (docs/business/DOMAIN_GLOSSARY_RED_COOPAGOS.md
 * §3.3 — matrícula, mensualidad, cuota...). `commerceId` comes from the
 * route (`/commerces/:commerceId/services`). No `status` — not confirmed for
 * Service, unlike Portal/Commerce/FormVersion (docs/adr/011).
 */
export const CreateServiceSchema = z.object({
  name: z.string().min(1).max(200),
});
export type CreateService = z.infer<typeof CreateServiceSchema>;

export const UpdateServiceSchema = CreateServiceSchema.partial();
export type UpdateService = z.infer<typeof UpdateServiceSchema>;

export const ServiceSchema = z.object({
  id: z.uuid(),
  commerceId: z.uuid(),
  name: z.string(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export type Service = z.infer<typeof ServiceSchema>;
