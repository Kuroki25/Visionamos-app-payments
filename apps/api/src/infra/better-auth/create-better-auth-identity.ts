import type { EntityManager } from 'typeorm';

export interface CreateBetterAuthIdentityInput {
  userId: string;
  email: string;
  fullName: string;
  passwordHash: string;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Inserts the Better Auth `user`+`account` rows an `AppUser` needs to
 * actually be able to sign in (docs/adr/013-better-auth-migration.md,
 * "Contraseñas") — MUST run inside the SAME transaction as whatever
 * inserts the `AppUser`/`role_assignments` rows it accompanies. A user
 * created in one system but not the other is either a login that can never
 * succeed (Better Auth has no record of them) or a data integrity gap
 * (an `AppUser` with no matching auth identity).
 *
 * `user`/`account` are Better Auth's own tables, not TypeORM entities —
 * raw queries via the transaction's own `manager`, same connection, same
 * atomicity. Reuses whatever Argon2id hash the caller already computed
 * (`argon2.hash`, package defaults) — no separate hashing here, no reset.
 *
 * Shared by every place an `AppUser` gets created:
 * `UsersService.createWithRoleAssignment` (`POST /users`, the real business
 * path), `src/scripts/seed-superadmin.ts` and `src/scripts/seed-demo.ts`
 * (bootstrap scripts), and `test/helpers/seed-superadmin.ts` (the e2e test
 * fixture) — one implementation, not four copies of the same raw SQL.
 */
export async function createBetterAuthIdentity(manager: EntityManager, input: CreateBetterAuthIdentityInput): Promise<void> {
  const now = new Date();
  const createdAt = input.createdAt ?? now;
  const updatedAt = input.updatedAt ?? now;

  await manager.query(
    `INSERT INTO "user" (id, name, email, "emailVerified", "createdAt", "updatedAt")
     VALUES ($1, $2, $3, true, $4, $5)`,
    [input.userId, input.fullName, input.email, createdAt, updatedAt],
  );
  // $1 bound to both "accountId" (text) and "userId" (uuid) as two separate
  // placeholders with the same value — Postgres infers one type per
  // parameter number across a statement and errors ("text versus uuid",
  // 42P08) if the same placeholder is reused against two different column
  // types (found the hard way in migrate-users-to-better-auth.ts).
  await manager.query(
    `INSERT INTO "account" (id, issuer, "accountId", "providerId", "userId", password, "createdAt", "updatedAt")
     VALUES (gen_random_uuid(), 'local:credential', $1, 'credential', $2, $3, $4, $5)`,
    [input.userId, input.userId, input.passwordHash, createdAt, updatedAt],
  );
}
