import { z } from 'zod';

/**
 * A Category is portal-specific (docs/business/ROLE_PERMISSION_MATRIX.md
 * §5.3 — "las categorías son específicas por portal") — `portalId` comes
 * from the route (`/portals/:portalId/categories`), never the body, so it
 * can't be spoofed independently of the scope already validated for that
 * route. No `status`/`isPublished` — not confirmed for Category, not
 * invented (docs/adr/011).
 */
export const CreateCategorySchema = z.object({
  name: z.string().min(1).max(200),
});
export type CreateCategory = z.infer<typeof CreateCategorySchema>;

export const UpdateCategorySchema = CreateCategorySchema.partial();
export type UpdateCategory = z.infer<typeof UpdateCategorySchema>;

export const CategorySchema = z.object({
  id: z.uuid(),
  portalId: z.uuid(),
  name: z.string(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export type Category = z.infer<typeof CategorySchema>;
