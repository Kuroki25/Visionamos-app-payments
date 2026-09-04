import { z } from 'zod';

/**
 * Shared pagination query parameters for every public listing endpoint
 * (docs/frontend/PORTAL_WEB_SOURCE_OF_TRUTH.md, "Public API Architecture").
 * `page` is 1-based. `pageSize` is capped at 50 — an unauthenticated public
 * endpoint must never let a caller request an unbounded page (the
 * portal-web master prompt, §54: search/pagination limits are enforced
 * server-side, never only in the UI). `z.coerce` because HTTP query
 * parameters always arrive as strings.
 */
export const PaginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(12),
});
export type PaginationQuery = z.infer<typeof PaginationQuerySchema>;

export const PageMetaSchema = z.object({
  page: z.number().int(),
  pageSize: z.number().int(),
  total: z.number().int(),
  totalPages: z.number().int(),
});
export type PageMeta = z.infer<typeof PageMetaSchema>;

/** `Math.max(1, ...)` so an empty result set still reports "página 1 de 1", never "de 0". */
export function buildPageMeta(page: number, pageSize: number, total: number): PageMeta {
  return { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

/** Wraps any item schema into `{ items, meta }` — the shape every paginated public endpoint returns. */
export function paginatedSchema<T extends z.ZodTypeAny>(itemSchema: T) {
  return z.object({
    items: z.array(itemSchema),
    meta: PageMetaSchema,
  });
}
