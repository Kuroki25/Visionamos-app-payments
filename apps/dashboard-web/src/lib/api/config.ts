import { env } from '../../env';

/**
 * Single place both `client.ts` (browser) and `server.ts` (Server
 * Components/Route Handlers) read the API base URL from — neither imports
 * `../../env` directly, so a future change to how the URL is resolved
 * touches only this file (docs/frontend/DASHBOARD_SOURCE_OF_TRUTH.md,
 * §8 "Integración con la API").
 */
export const API_BASE_URL = env.NEXT_PUBLIC_API_URL;

/** Root origin of the Better Auth instance — consumed by `lib/auth/client.ts`. Not derived from API_BASE_URL; see env.ts. */
export const BETTER_AUTH_URL = env.NEXT_PUBLIC_BETTER_AUTH_URL;
