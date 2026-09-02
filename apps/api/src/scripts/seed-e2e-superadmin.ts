import 'reflect-metadata';
import * as argon2 from 'argon2';
import { randomUUID } from 'node:crypto';

import { AppDataSource } from '../config/data-source';
import { createBetterAuthIdentity } from '../infra/better-auth/create-better-auth-identity';
import { AuditEventEntity } from '../modules/audit/entities/audit-event.entity';
import { RoleAssignmentEntity } from '../modules/role-assignments/entities/role-assignment.entity';
import { UserEntity } from '../modules/users/entities/user.entity';

/**
 * Seeds a SECOND, dedicated SUPERADMIN account exclusively for E2E
 * (`e2e/superadmin.spec.ts`). `seed-superadmin.ts` refuses to run once any
 * SUPERADMIN exists at all (by design — "idempotent bootstrap for the
 * FIRST SUPERADMIN"), and the original bootstrap SUPERADMIN's password is
 * unknown here (never committed — `docs/frontend/DASHBOARD_SOURCE_OF_TRUTH.md`
 * §11.3). So E2E cannot log in as that account, and per the same doc's
 * rule ("no cambiar contraseñas de cuentas importantes") it shouldn't
 * reset it either. This script creates an independent SUPERADMIN so the
 * real happy path can be exercised without ever touching that identity —
 * same idea as the dedicated `e2e-password-lifecycle@example.com` user
 * from the previous closure pass.
 *
 * Same direct-repository pattern as `seed-demo.ts`/`seed-superadmin.ts`
 * (trusted, hand-crafted data — docs/adr/010). Password is the literal
 * already used by every demo user in `seed-demo.ts` (`DEMO_PASSWORD`) —
 * not a new secret, and never real production data (local/dev/test DB
 * only).
 *
 * Idempotent: exits cleanly if this email already has a user row.
 */
const E2E_SUPERADMIN_EMAIL = 'e2e-superadmin@example.com';
const E2E_SUPERADMIN_FULL_NAME = 'E2E Superadmin';
/** Same literal as `seed-demo.ts`'s `DEMO_PASSWORD` — see this file's docblock. */
const DEMO_PASSWORD = 'a-strong-password-123';

async function main(): Promise<void> {
  await AppDataSource.initialize();
  try {
    const existing = await AppDataSource.getRepository(UserEntity).findOneBy({ email: E2E_SUPERADMIN_EMAIL });
    if (existing) {
      // eslint-disable-next-line no-console -- CLI script status output, not a leftover debug log.
      console.log('E2E SUPERADMIN already exists — nothing to do.');
      return;
    }

    const passwordHash = await argon2.hash(DEMO_PASSWORD);
    const userId = randomUUID(); // Better Auth's `user` row must exist before `users.id` can reference it (FK).

    await AppDataSource.transaction(async (manager) => {
      const userRepository = manager.getRepository(UserEntity);
      const assignmentRepository = manager.getRepository(RoleAssignmentEntity);
      const auditRepository = manager.getRepository(AuditEventEntity);

      await createBetterAuthIdentity(manager, {
        userId,
        email: E2E_SUPERADMIN_EMAIL,
        fullName: E2E_SUPERADMIN_FULL_NAME,
        passwordHash,
      });

      const user = await userRepository.save(
        userRepository.create({ id: userId, email: E2E_SUPERADMIN_EMAIL, fullName: E2E_SUPERADMIN_FULL_NAME, status: 'ACTIVE' }),
      );

      await assignmentRepository.save(
        assignmentRepository.create({
          userId: user.id,
          role: 'SUPERADMIN',
          scopeType: 'GLOBAL',
          scopePortalId: null,
          scopeCommerceId: null,
        }),
      );

      // Self-authored, same as seed-superadmin.ts's bootstrap SUPERADMIN —
      // there is no dashboard actor session behind a seed script.
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
    console.log(`E2E SUPERADMIN created: ${E2E_SUPERADMIN_EMAIL}`);
  } finally {
    await AppDataSource.destroy();
  }
}

main().catch((error: unknown) => {
  console.error('seed-e2e-superadmin failed:', error);
  process.exitCode = 1;
});
