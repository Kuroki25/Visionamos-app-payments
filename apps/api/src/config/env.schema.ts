import { z } from 'zod';

/**
 * `z.coerce.boolean()` runs env vars through JS's `Boolean(str)` coercion,
 * under which any non-empty string — including the literal `"false"` — is
 * truthy. That silently turned `COOKIE_SECURE=false`/`DB_SSL=false` (both
 * documented in .env.example for local http:// development) into `true`.
 * This instead only accepts the actual string values an env var can sanely
 * hold and fails fast (via the enum) on anything else.
 */
function booleanFromEnv(defaultValue: boolean) {
  return z
    .enum(['true', 'false', '1', '0'])
    .default(defaultValue ? 'true' : 'false')
    .transform((value) => value === 'true' || value === '1');
}

/**
 * Runtime-validated environment configuration (docs/adr/005-validation-strategy.md).
 * The app must fail fast at startup if a required variable is missing or
 * malformed, instead of limping along with `process.env.X!` scattered around
 * the codebase.
 */
export const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  // Non-default port (4100, not 4000) — see apps/api/.env.example: this
  // whole project deliberately avoids 3000/3001/4000/5432 to not collide
  // with other projects' dev servers running concurrently on the same
  // machine.
  PORT: z.coerce.number().int().positive().default(4100),

  // Comma-separated allowlist — never "*" with credentials enabled (section 23).
  CORS_ALLOWED_ORIGINS: z.string().min(1).default('http://localhost:3100,http://localhost:3101'),

  // Swagger must be an explicit opt-in per environment (section 15).
  SWAGGER_ENABLED: booleanFromEnv(true),

  THROTTLE_TTL_MS: z.coerce.number().int().positive().default(60_000),
  THROTTLE_LIMIT: z.coerce.number().int().positive().default(100),

  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  // PostgreSQL via TypeORM (docs/adr/010-persistence.md). In NODE_ENV=test the
  // app uses an in-memory SQLite database instead (see database.module.ts) so
  // the test suite never needs a live Postgres — these variables are simply
  // unused in that mode.
  DB_HOST: z.string().default('localhost'),
  DB_PORT: z.coerce.number().int().positive().default(5442),
  DB_USERNAME: z.string().default('visionamos'),
  DB_PASSWORD: z.string().default('visionamos'),
  DB_NAME: z.string().default('visionamos'),
  DB_SSL: booleanFromEnv(false),

  // Authentication (docs/adr/006-authentication-strategy.md). No defaults on
  // purpose — a missing signing secret must fail startup loudly, never fall
  // back to a guessable value. Separate secrets for access vs refresh tokens
  // so a leaked access-token key can't be used to forge refresh tokens.
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters.'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters.'),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL_DAYS: z.coerce.number().int().positive().default(7),
  // Cookies must be Secure (HTTPS-only) outside local development.
  COOKIE_SECURE: booleanFromEnv(true),
});

export type Env = z.infer<typeof EnvSchema>;

/**
 * Passed to `ConfigModule.forRoot({ validate })`. Nest lets whatever this
 * throws propagate out of application bootstrap, which is exactly the
 * "fail fast on missing config" behaviour required by the spec.
 */
export function validateEnv(raw: Record<string, unknown>): Env {
  const parsed = EnvSchema.safeParse(raw);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  return parsed.data;
}
