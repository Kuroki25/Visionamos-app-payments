import { z } from 'zod';

// Only NEXT_PUBLIC_-prefixed variables may end up in the browser bundle
// (section 9) — this file is the single place that reads process.env in this
// app, so nothing un-prefixed can leak in by accident. If a server-only
// secret is ever needed here, it must NOT be added to this schema — create a
// separate server-only env module instead (this file is imported from both
// Server and Client Components today).
const EnvSchema = z.object({
  NEXT_PUBLIC_API_URL: z.url().default('http://localhost:4100/api/v1'),
  // Root origin of the NestJS Better Auth instance (docs/adr/013-better-auth-migration.md).
  // Deliberately NOT `${NEXT_PUBLIC_API_URL}/auth` — Better Auth's handler is
  // mounted at `/api/auth` outside the `api/v1` prefix
  // (apps/api/src/infra/better-auth/mount-better-auth-handler.ts), so this is
  // a different base path on the same host, not a derived value.
  NEXT_PUBLIC_BETTER_AUTH_URL: z.url().default('http://localhost:4100'),
});

export const env = EnvSchema.parse({
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  NEXT_PUBLIC_BETTER_AUTH_URL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL,
});
