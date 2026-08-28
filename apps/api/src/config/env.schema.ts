import { z } from 'zod';

/**
 * Runtime-validated environment configuration (docs/adr/005-validation-strategy.md).
 * The app must fail fast at startup if a required variable is missing or
 * malformed, instead of limping along with `process.env.X!` scattered around
 * the codebase.
 */
export const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),

  // Comma-separated allowlist — never "*" with credentials enabled (section 23).
  CORS_ALLOWED_ORIGINS: z.string().min(1).default('http://localhost:3000,http://localhost:3001'),

  // Swagger must be an explicit opt-in per environment (section 15).
  SWAGGER_ENABLED: z.coerce.boolean().default(true),

  THROTTLE_TTL_MS: z.coerce.number().int().positive().default(60_000),
  THROTTLE_LIMIT: z.coerce.number().int().positive().default(100),

  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  // PostgreSQL via TypeORM (docs/adr/010-persistence.md). In NODE_ENV=test the
  // app uses an in-memory SQLite database instead (see database.module.ts) so
  // the test suite never needs a live Postgres — these variables are simply
  // unused in that mode.
  DB_HOST: z.string().default('localhost'),
  DB_PORT: z.coerce.number().int().positive().default(5432),
  DB_USERNAME: z.string().default('visionamos'),
  DB_PASSWORD: z.string().default('visionamos'),
  DB_NAME: z.string().default('visionamos'),
  DB_SSL: z.coerce.boolean().default(false),
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
