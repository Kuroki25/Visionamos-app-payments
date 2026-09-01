import type { Role, ScopeType } from '@repo/contracts';

/**
 * The principal `BetterAuthSessionGuard` attaches to `req.user`
 * (docs/adr/013-better-auth-migration.md) — resolved fresh from
 * `role_assignments` on every request, never embedded in a token (unlike
 * the retired JWT `AccessTokenPayload` this type used to be an alias for).
 * `scopePortalId`/`scopeCommerceId` are mutually exclusive and derived from
 * `scopeType` (GLOBAL → both null, PORTAL → only scopePortalId, COMMERCE →
 * only scopeCommerceId) — mirrors the `role_assignments` CHECK constraints.
 */
export interface AuthenticatedRequestUser {
  sub: string;
  role: Role;
  scopeType: ScopeType;
  scopePortalId: string | null;
  scopeCommerceId: string | null;
}
