-- Better Auth's own schema (user/session/account/verification) — captured
-- verbatim from a real `npx auth@1.7.2 generate` run against this project's
-- config (docs/auth-migration/06-real-migration-run.md §1), with `IF NOT
-- EXISTS` added so `test/global-setup-postgres.ts` can apply it idempotently
-- to the dedicated `visionamos_test` database on every test run.
--
-- This is NOT auto-generated on every run — Better Auth's CLI needs network
-- access (npm registry) and takes real time, which the test suite shouldn't
-- pay on every invocation. This file is the tracked, offline, deterministic
-- equivalent, kept in sync by hand (docs/adr/013-better-auth-migration.md,
-- "dos historiales de migración" — same principle as the dev/prod database,
-- just captured as a static file here instead of re-run via the CLI). If
-- `better-auth.factory.ts`'s config ever changes in a way that changes this
-- schema (a new plugin, `additionalFields`, etc.), re-run
-- `pnpm dlx auth@<version> generate --config src/infra/better-auth/auth.cli.ts`
-- and update this file to match.

create table if not exists "user" (
  "id" uuid default pg_catalog.gen_random_uuid() not null primary key,
  "name" text not null,
  "email" text not null unique,
  "emailVerified" boolean not null,
  "image" text,
  "createdAt" timestamptz default CURRENT_TIMESTAMP not null,
  "updatedAt" timestamptz default CURRENT_TIMESTAMP not null
);

create table if not exists "session" (
  "id" uuid default pg_catalog.gen_random_uuid() not null primary key,
  "expiresAt" timestamptz not null,
  "token" text not null unique,
  "createdAt" timestamptz default CURRENT_TIMESTAMP not null,
  "updatedAt" timestamptz not null,
  "ipAddress" text,
  "userAgent" text,
  "userId" uuid not null references "user" ("id") on delete cascade
);

create table if not exists "account" (
  "id" uuid default pg_catalog.gen_random_uuid() not null primary key,
  "issuer" text not null,
  "accountId" text not null,
  "providerId" text not null,
  "userId" uuid not null references "user" ("id") on delete cascade,
  "accessToken" text,
  "refreshToken" text,
  "idToken" text,
  "accessTokenExpiresAt" timestamptz,
  "refreshTokenExpiresAt" timestamptz,
  "scope" text,
  "password" text,
  "createdAt" timestamptz default CURRENT_TIMESTAMP not null,
  "updatedAt" timestamptz not null
);

create table if not exists "verification" (
  "id" uuid default pg_catalog.gen_random_uuid() not null primary key,
  "identifier" text not null,
  "value" text not null,
  "expiresAt" timestamptz not null,
  "createdAt" timestamptz default CURRENT_TIMESTAMP not null,
  "updatedAt" timestamptz default CURRENT_TIMESTAMP not null
);

create index if not exists "session_userId_idx" on "session" ("userId");
create index if not exists "account_userId_idx" on "account" ("userId");
create index if not exists "verification_identifier_idx" on "verification" ("identifier");
create unique index if not exists "account_issuer_accountId_uidx" on "account" ("issuer", "accountId");
