import 'server-only';

import type { PublicPortal, PublicPortalsResponse } from '@repo/contracts';

import { ApiError } from '../../lib/api/errors';
import { serverApiClient } from '../../lib/api/server';

export interface ListPortalsParams {
  q?: string | undefined;
  page?: number | undefined;
}

/** `GET /public/portals` — every published+active Portal (`PublicCatalogController`). */
export async function listPublishedPortals(params: ListPortalsParams = {}): Promise<PublicPortalsResponse> {
  const search = new URLSearchParams();
  if (params.q) search.set('q', params.q);
  if (params.page) search.set('page', String(params.page));
  const qs = search.toString();
  return serverApiClient.get<PublicPortalsResponse>(`/public/portals${qs ? `?${qs}` : ''}`);
}

/** `GET /public/portals/:id` — `null` for a Portal that's unpublished/inactive/nonexistent/not a UUID (all 404/400 on the backend), never a thrown error the page has to catch. */
export async function getPublishedPortal(id: string): Promise<PublicPortal | null> {
  try {
    return await serverApiClient.get<PublicPortal>(`/public/portals/${id}`);
  } catch (cause) {
    if (cause instanceof ApiError && (cause.isNotFound || cause.status === 400)) {
      return null;
    }
    throw cause;
  }
}
