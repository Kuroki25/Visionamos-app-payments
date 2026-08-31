import { DefaultNamingStrategy } from 'typeorm';
import type { NamingStrategyInterface } from 'typeorm';

/** camelCase/PascalCase property name → snake_case column name ("fullName" → "full_name"). */
function toSnakeCase(input: string): string {
  return input.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
}

/**
 * TypeORM's default naming strategy emits columns verbatim from the entity
 * property name (`fullName`, `passwordHash`) — real camelCase in the
 * database, not a display quirk. Professional schema design (docs/adr/011)
 * wants consistent snake_case across every table, old and new — applying it
 * only to the tables introduced with Red Coopagos would leave the database
 * with two conventions mixed. This is a deliberately small, self-written
 * strategy (only `columnName` is overridden) rather than adding the
 * `typeorm-naming-strategies` package: it would need the same peer/version
 * scrutiny already applied to every other dependency (ADR 009/010) to
 * replace ~10 lines of logic.
 *
 * Registered identically wherever a TypeORM connection is built —
 * `database.module.ts` (Postgres + the SQLite test branch) and
 * `data-source.ts` (the migration CLI) — so the generated schema can never
 * diverge between them.
 */
export class SnakeCaseNamingStrategy extends DefaultNamingStrategy implements NamingStrategyInterface {
  override columnName(propertyName: string, customName: string | undefined, embeddedPrefixes: string[]): string {
    const base = customName ?? toSnakeCase(propertyName);
    if (embeddedPrefixes.length === 0) {
      return base;
    }
    return toSnakeCase(embeddedPrefixes.join('_')) + '_' + base;
  }
}
