/**
 * Split into its own file, deliberately, so nothing that only needs the DI
 * token (a guard's constructor, a unit test's mock provider) is forced to
 * pull in `better-auth.module.ts` — which imports the real `better-auth`
 * package (ESM-only, `.mjs`) transitively via `better-auth.factory.ts`.
 * Jest's default module loader doesn't transform `node_modules` and can't
 * execute that package's bare `import` syntax; importing only this token
 * keeps a unit test's module graph free of it entirely, no `jest.mock(...)`
 * needed.
 */
export const BETTER_AUTH_INSTANCE = Symbol('BETTER_AUTH_INSTANCE');
