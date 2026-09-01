import * as argon2 from 'argon2';

/**
 * Wraps the exact same Argon2id calls `AuthService`/`UsersService` already
 * use (`argon2.hash(password)`, `argon2.verify(hash, password)` — package
 * defaults, no options passed, verified in Fase 1:
 * `memoryCost 65536, timeCost 3, parallelism 4`) behind the
 * `emailAndPassword.password.hash`/`.verify` shape Better Auth expects
 * (`node_modules/@better-auth/core/dist/types/init-options.d.mts`, verified
 * against the installed `better-auth@1.7.2`). This lets Better Auth reuse
 * every already-hashed password without forcing a reset — see
 * docs/adr/013-better-auth-migration.md, "Contraseñas".
 *
 * Intentionally duplicated instead of importing from `AuthService`: this
 * module is isolated infrastructure (Fase 5) that nothing wires into the
 * running app yet (Fase 6 does that) — it must not create a dependency on
 * the legacy auth module it is meant to eventually replace.
 */
export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password);
}

export async function verifyPassword(data: { hash: string; password: string }): Promise<boolean> {
  return argon2.verify(data.hash, data.password);
}
