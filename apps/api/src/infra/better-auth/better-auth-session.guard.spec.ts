import type { ExecutionContext } from '@nestjs/common';
import { UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { RoleAssignmentEntity } from '../../modules/role-assignments/entities/role-assignment.entity';
import { UserEntity } from '../../modules/users/entities/user.entity';
import { BetterAuthSessionGuard } from './better-auth-session.guard';
import { BETTER_AUTH_INSTANCE } from './better-auth.token';

// `better-auth/node` (`fromNodeHeaders`) is published ESM-only (.mjs) and
// transitively imports from `better-call/node`, also ESM-only. Node 24 loads
// this fine at runtime (verified in docs/auth-migration/04-infrastructure-implementation.md
// — `require('better-auth')` works, and so does the `nest build`-compiled
// output), but Jest's own module loader doesn't transform `node_modules` by
// default and chokes on the bare `import` syntax. Mocked here — Jest hoists
// `jest.mock()` above every import in this file automatically — rather than
// widening the shared `transformIgnorePatterns` in `package.json` for one
// still-isolated module nothing else depends on yet; the real production
// entrypoint never goes through Jest's loader, so this only affects tests.
jest.mock('better-auth/node', () => ({ fromNodeHeaders: jest.fn() }));

/**
 * Docker was unavailable this session (docs/auth-migration/04-infrastructure-implementation.md),
 * so this proves the guard's own logic — session → AuthenticatedRequestUser,
 * every deny-by-default branch — against a *simulated* `auth.api.getSession`,
 * not a real Better Auth session backed by Postgres. Real end-to-end login
 * coverage is still owed once Docker is up (see that document's "Pendiente").
 */
function buildContext(headers: Record<string, string> = {}): {
  context: ExecutionContext;
  request: { headers: Record<string, string>; user?: unknown };
} {
  const request: { headers: Record<string, string>; user?: unknown } = { headers };
  const context = {
    getHandler: () => undefined,
    getClass: () => undefined,
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
  return { context, request };
}

describe('BetterAuthSessionGuard', () => {
  let guard: BetterAuthSessionGuard;
  let getSession: jest.Mock;
  let usersRepository: { findOneBy: jest.Mock };
  let roleAssignmentsRepository: { findOneBy: jest.Mock };
  let reflector: Reflector;

  beforeEach(async () => {
    getSession = jest.fn();
    usersRepository = { findOneBy: jest.fn() };
    roleAssignmentsRepository = { findOneBy: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BetterAuthSessionGuard,
        Reflector,
        { provide: BETTER_AUTH_INSTANCE, useValue: { api: { getSession } } },
        { provide: getRepositoryToken(UserEntity), useValue: usersRepository },
        { provide: getRepositoryToken(RoleAssignmentEntity), useValue: roleAssignmentsRepository },
      ],
    }).compile();

    guard = module.get(BetterAuthSessionGuard);
    reflector = module.get(Reflector);
  });

  it('allows a @Public() route without calling Better Auth at all', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);
    const { context } = buildContext();

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(getSession).not.toHaveBeenCalled();
  });

  it('rejects when Better Auth resolves no session', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    getSession.mockResolvedValue(null);
    const { context } = buildContext();

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it('rejects when the profile is INACTIVE, even with a valid session', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    getSession.mockResolvedValue({ session: { userId: 'u1' }, user: { id: 'u1' } });
    usersRepository.findOneBy.mockResolvedValue({ id: 'u1', status: 'INACTIVE' });
    const { context } = buildContext();

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it('rejects when the user has no role assignment (data corruption, not a normal case)', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    getSession.mockResolvedValue({ session: { userId: 'u1' }, user: { id: 'u1' } });
    usersRepository.findOneBy.mockResolvedValue({ id: 'u1', status: 'ACTIVE' });
    roleAssignmentsRepository.findOneBy.mockResolvedValue(null);
    const { context } = buildContext();

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it('attaches AuthenticatedRequestUser built from role_assignments, not from the session', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    getSession.mockResolvedValue({ session: { userId: 'u1' }, user: { id: 'u1' } });
    usersRepository.findOneBy.mockResolvedValue({ id: 'u1', status: 'ACTIVE' });
    roleAssignmentsRepository.findOneBy.mockResolvedValue({
      userId: 'u1',
      role: 'ADMIN_PORTAL',
      scopeType: 'PORTAL',
      scopePortalId: 'portal-a',
      scopeCommerceId: null,
    });
    const { context, request } = buildContext();

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.user).toEqual({
      sub: 'u1',
      role: 'ADMIN_PORTAL',
      scopeType: 'PORTAL',
      scopePortalId: 'portal-a',
      scopeCommerceId: null,
    });
  });
});
