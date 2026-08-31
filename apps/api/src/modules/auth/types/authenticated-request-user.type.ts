import type { Role, ScopeType } from '@repo/contracts';

/**
 * Embedded in the access token (docs/adr/011-authorization-role-scope.md) —
 * extends the same "role in the JWT, not resolved per-request" pattern
 * ADR 006 already established, now with the organizational scope alongside
 * it. `scopePortalId`/`scopeCommerceId` are mutually exclusive and derived
 * from `scopeType` (GLOBAL → both null, PORTAL → only scopePortalId,
 * COMMERCE → only scopeCommerceId) — mirrors the `role_assignments` CHECK
 * constraints.
 */
export interface AccessTokenPayload {
  sub: string;
  role: Role;
  scopeType: ScopeType;
  scopePortalId: string | null;
  scopeCommerceId: string | null;
}

/** Same shape as AccessTokenPayload — JwtAuthGuard attaches the verified payload as-is to `request.user`. */
export type AuthenticatedRequestUser = AccessTokenPayload;

export interface RefreshTokenPayload {
  sub: string;
  jti: string;
}
