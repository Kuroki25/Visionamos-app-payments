import type { INestApplication } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as argon2 from 'argon2';
import { randomUUID } from 'node:crypto';
import type { Repository } from 'typeorm';

import { createBetterAuthIdentity } from '../../src/infra/better-auth/create-better-auth-identity';
import { RoleAssignmentEntity } from '../../src/modules/role-assignments/entities/role-assignment.entity';
import { UserEntity } from '../../src/modules/users/entities/user.entity';

export interface SeededSuperadmin {
  id: string;
  email: string;
  password: string;
}

/**
 * Test-fixture equivalent of src/scripts/seed-superadmin.ts. That script
 * uses a standalone DataSource because it runs outside any booted app; here
 * the app is already booted in-process for the e2e suite, so this inserts
 * directly via Nest's own repositories instead. This is the only place any
 * e2e test creates a user by talking to the database directly rather than
 * through the real HTTP API — it exists solely to break the bootstrap
 * circularity (POST /users requires an authenticated SUPERADMIN; creating
 * the first one requires this).
 *
 * Since the cutover (docs/adr/013-better-auth-migration.md), this also
 * creates the matching Better Auth `user`/`account` rows
 * (`createBetterAuthIdentity`) so the seeded superadmin can actually sign
 * in via `TestSession.login()` (`POST /api/auth/sign-in/email`,
 * `BetterAuthSessionGuard` is what really runs now) — same helper
 * `UsersService.createWithRoleAssignment` uses for real users.
 */
export async function seedSuperadmin(
  app: INestApplication,
  email = `superadmin-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`,
): Promise<SeededSuperadmin> {
  const password = 'a-strong-password-123';
  const usersRepository: Repository<UserEntity> = app.get(getRepositoryToken(UserEntity));
  const roleAssignmentsRepository: Repository<RoleAssignmentEntity> = app.get(getRepositoryToken(RoleAssignmentEntity));

  const passwordHash = await argon2.hash(password);
  const userId = randomUUID(); // Better Auth's `user` row must exist before `users.id` can reference it (FK).

  await createBetterAuthIdentity(usersRepository.manager, { userId, email, fullName: 'Seed Superadmin', passwordHash });

  const user = await usersRepository.save(
    usersRepository.create({ id: userId, email, fullName: 'Seed Superadmin', status: 'ACTIVE' }),
  );
  await roleAssignmentsRepository.save(
    roleAssignmentsRepository.create({
      userId: user.id,
      role: 'SUPERADMIN',
      scopeType: 'GLOBAL',
      scopePortalId: null,
      scopeCommerceId: null,
    }),
  );

  return { id: user.id, email, password };
}
