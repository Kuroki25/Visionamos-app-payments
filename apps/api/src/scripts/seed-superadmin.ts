import 'reflect-metadata';
import * as argon2 from 'argon2';
import { randomUUID } from 'node:crypto';

import { AppDataSource } from '../config/data-source';
import { createBetterAuthIdentity } from '../infra/better-auth/create-better-auth-identity';
import { AuditEventEntity } from '../modules/audit/entities/audit-event.entity';
import { RoleAssignmentEntity } from '../modules/role-assignments/entities/role-assignment.entity';
import { UserEntity } from '../modules/users/entities/user.entity';

/**
 * Idempotent bootstrap for the first SUPERADMIN (docs/adr/010/011).
 * `POST /auth/register` doesn't exist in Red Coopagos and `POST /users`
 * requires an already-authenticated SUPERADMIN/ADMIN_PORTAL/ADMIN_COMMERCE
 * — without this script there is no way to create the very first account.
 *
 * Deliberately NOT a migration (credentials, even hashed, shouldn't live
 * forever in migration history) and NOT auto-run on `main.ts` boot (would
 * silently recreate a SUPERADMIN someone deactivated on purpose). Run
 * explicitly: `pnpm --filter api seed:superadmin`.
 */
async function main(): Promise<void> {
  const email = process.env.SUPERADMIN_EMAIL;
  const password = process.env.SUPERADMIN_PASSWORD;
  const fullName = process.env.SUPERADMIN_FULL_NAME;

  if (!email || !password || !fullName) {
    throw new Error('SUPERADMIN_EMAIL, SUPERADMIN_PASSWORD and SUPERADMIN_FULL_NAME must all be set.');
  }
  if (password.length < 12) {
    throw new Error('SUPERADMIN_PASSWORD must be at least 12 characters — same policy as every other account.');
  }

  await AppDataSource.initialize();
  try {
    const existing = await AppDataSource.getRepository(RoleAssignmentEntity).findOneBy({ role: 'SUPERADMIN' });
    if (existing) {
      // eslint-disable-next-line no-console -- CLI script status output, not a leftover debug log.
      console.log('A SUPERADMIN already exists — nothing to do.');
      return;
    }

    const passwordHash = await argon2.hash(password);
    const userId = randomUUID(); // Better Auth's `user` row must exist before `users.id` can reference it (FK).

    await AppDataSource.transaction(async (manager) => {
      const userRepository = manager.getRepository(UserEntity);
      const assignmentRepository = manager.getRepository(RoleAssignmentEntity);
      const auditRepository = manager.getRepository(AuditEventEntity);

      await createBetterAuthIdentity(manager, { userId, email, fullName, passwordHash });

      const user = await userRepository.save(userRepository.create({ id: userId, email, fullName, status: 'ACTIVE' }));

      await assignmentRepository.save(
        assignmentRepository.create({
          userId: user.id,
          role: 'SUPERADMIN',
          scopeType: 'GLOBAL',
          scopePortalId: null,
          scopeCommerceId: null,
        }),
      );

      // Self-authored: the bootstrap SUPERADMIN is its own actor — there is
      // no other user yet to attribute this creation to.
      await auditRepository.save(
        auditRepository.create({
          actorUserId: user.id,
          action: 'USER_CREATED',
          targetType: 'USER',
          targetId: user.id,
          scopeType: 'GLOBAL',
          scopePortalId: null,
          scopeCommerceId: null,
          newValue: { email: user.email, role: 'SUPERADMIN', scopeType: 'GLOBAL' },
        }),
      );
    });

    // eslint-disable-next-line no-console -- CLI script status output, not a leftover debug log.
    console.log(`SUPERADMIN created: ${email}`);
  } finally {
    await AppDataSource.destroy();
  }
}

main().catch((error: unknown) => {
  console.error('seed-superadmin failed:', error);
  process.exitCode = 1;
});
