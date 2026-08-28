import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule, type TypeOrmModuleOptions } from '@nestjs/typeorm';

import { UserEntity } from '../modules/users/entities/user.entity';
import type { Env } from './env.schema';

const ENTITIES = [UserEntity];

/**
 * Persistence wiring (docs/adr/010-persistence.md). Production/development
 * use PostgreSQL; NODE_ENV=test swaps in an in-memory SQLite database so the
 * integration test suite (test/app.e2e-spec.ts) can boot the real AppModule
 * without a live Postgres instance — a deliberate, documented trade-off, not
 * a hidden shortcut. `synchronize` is only ever on outside production;
 * production schema changes must go through TypeORM migrations (not yet set
 * up — tracked as a pending item in docs/DEPENDENCY_POLICY.md).
 */
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>): TypeOrmModuleOptions => {
        const nodeEnv = config.get('NODE_ENV', { infer: true });

        if (nodeEnv === 'test') {
          return {
            type: 'better-sqlite3',
            database: ':memory:',
            dropSchema: true,
            synchronize: true,
            entities: ENTITIES,
          };
        }

        return {
          type: 'postgres',
          host: config.get('DB_HOST', { infer: true }),
          port: config.get('DB_PORT', { infer: true }),
          username: config.get('DB_USERNAME', { infer: true }),
          password: config.get('DB_PASSWORD', { infer: true }),
          database: config.get('DB_NAME', { infer: true }),
          ssl: config.get('DB_SSL', { infer: true }),
          synchronize: nodeEnv === 'development',
          entities: ENTITIES,
        };
      },
    }),
  ],
})
export class DatabaseModule {}
