import type { INestApplication } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as argon2 from 'argon2';
import type { Repository } from 'typeorm';

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
 */
export async function seedSuperadmin(
  app: INestApplication,
  email = `superadmin-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`,
): Promise<SeededSuperadmin> {
  const password = 'a-strong-password-123';
  const usersRepository: Repository<UserEntity> = app.get(getRepositoryToken(UserEntity));
  const roleAssignmentsRepository: Repository<RoleAssignmentEntity> = app.get(getRepositoryToken(RoleAssignmentEntity));

  const passwordHash = await argon2.hash(password);
  const user = await usersRepository.save(
    usersRepository.create({ email, fullName: 'Seed Superadmin', passwordHash, status: 'ACTIVE' }),
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
