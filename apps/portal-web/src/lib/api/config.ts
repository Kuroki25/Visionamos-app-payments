import { env } from '../../env';

/**
 * Single place any API-calling code reads the base URL from
 * (docs/frontend/PORTAL_WEB_SOURCE_OF_TRUTH.md, "Public API Architecture") —
 * same pattern as dashboard-web's `lib/api/config.ts`.
 */
export const API_BASE_URL = env.NEXT_PUBLIC_API_URL;
