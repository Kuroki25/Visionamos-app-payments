import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Marks a route as reachable without authentication. Every route is
 * protected by default (JwtAuthGuard is registered globally via APP_GUARD —
 * section 22 "default deny") — this is the explicit, auditable opt-out.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
