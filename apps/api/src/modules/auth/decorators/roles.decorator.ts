import { SetMetadata } from '@nestjs/common';
import type { Role } from '@repo/contracts';

export const ROLES_KEY = 'roles';

/** Function-level authorization (API5) — see guards/roles.guard.ts. */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
