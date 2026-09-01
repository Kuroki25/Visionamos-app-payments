import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { getDataSourceToken, getRepositoryToken } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';

import { AuditService } from '../audit/audit.service';
import { CommerceEntity } from '../commerces/entities/commerce.entity';
import { RoleAssignmentEntity } from '../role-assignments/entities/role-assignment.entity';
import { ScopeAuthorizationService } from '../role-assignments/scope-authorization.service';
import type { AuthenticatedRequestUser } from '../auth/types/authenticated-request-user.type';
import { UserEntity } from './entities/user.entity';
import { UsersService } from './users.service';

// Unit test: every dependency is mocked so this exercises UsersService's own
// logic in isolation. The real Postgres/SQLite-backed path (including
// authorization end-to-end) is covered by the integration tests in
// test/*.e2e-spec.ts (docs/adr/007-testing-strategy.md).
// The repository method surface (create/save/find/...) is identical across
// entities regardless of which one backs it — UserEntity stands in for all
// three repositories mocked below (User/RoleAssignment/Commerce).
type MockRepository = Partial<Record<keyof Repository<UserEntity>, jest.Mock>>;

function createMockRepository(): MockRepository {
  return {
    create: jest.fn((input: Partial<UserEntity>) => input),
    save: jest.fn(),
    find: jest.fn(),
    findOneBy: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
}

const SUPERADMIN: AuthenticatedRequestUser = {
  sub: 'actor-1',
  role: 'SUPERADMIN',
  scopeType: 'GLOBAL',
  scopePortalId: null,
  scopeCommerceId: null,
};

const ADMIN_PORTAL_A: AuthenticatedRequestUser = {
  sub: 'actor-2',
  role: 'ADMIN_PORTAL',
  scopeType: 'PORTAL',
  scopePortalId: 'portal-a',
  scopeCommerceId: null,
};

describe('UsersService', () => {
  let service: UsersService;
  let usersRepository: MockRepository;
  let roleAssignmentsRepository: MockRepository;
  let commercesRepository: MockRepository;
  let auditService: { record: jest.Mock };
  let scopeAuthorization: { assertCanAssignRole: jest.Mock };

  beforeEach(async () => {
    usersRepository = createMockRepository();
    roleAssignmentsRepository = createMockRepository();
    commercesRepository = createMockRepository();
    auditService = { record: jest.fn() };
    scopeAuthorization = { assertCanAssignRole: jest.fn() };

    const mockManager = {
      getRepository: jest.fn((entity: unknown) => {
        if (entity === UserEntity) return usersRepository;
        if (entity === RoleAssignmentEntity) return roleAssignmentsRepository;
        return createMockRepository();
      }),
      // createBetterAuthIdentity (docs/adr/013) issues two raw INSERTs
      // against Better Auth's user/account tables via manager.query — not
      // exercised by assertions here (that's Postgres-only, covered by the
      // real e2e suite), just needs to resolve so the transaction callback
      // completes.
      query: jest.fn().mockResolvedValue(undefined),
    };
    const mockDataSource = { transaction: jest.fn((cb: (manager: unknown) => unknown) => cb(mockManager)) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(UserEntity), useValue: usersRepository },
        { provide: getRepositoryToken(RoleAssignmentEntity), useValue: roleAssignmentsRepository },
        { provide: getRepositoryToken(CommerceEntity), useValue: commercesRepository },
        { provide: getDataSourceToken(), useValue: mockDataSource },
        { provide: ScopeAuthorizationService, useValue: scopeAuthorization },
        { provide: AuditService, useValue: auditService },
      ],
    }).compile();

    service = module.get(UsersService);
  });

  describe('createWithRoleAssignment', () => {
    const now = new Date('2026-01-01T00:00:00.000Z');
    const input = {
      email: 'ana@example.com',
      password: 'a-strong-password-123',
      fullName: 'Ana Pérez',
      role: 'ADMIN_PORTAL' as const,
      scopePortalId: 'portal-a',
    };

    it('creates a user + role assignment via a transaction and audits USER_CREATED', async () => {
      (usersRepository.findOneBy as jest.Mock).mockResolvedValue(null);
      (usersRepository.save as jest.Mock).mockResolvedValue({
        id: 'user-1',
        email: input.email,
        fullName: input.fullName,
        status: 'ACTIVE',
        createdAt: now,
      });
      (roleAssignmentsRepository.save as jest.Mock).mockResolvedValue({
        role: 'ADMIN_PORTAL',
        scopeType: 'PORTAL',
        scopePortalId: 'portal-a',
        scopeCommerceId: null,
      });

      const user = await service.createWithRoleAssignment(SUPERADMIN, input);

      expect(scopeAuthorization.assertCanAssignRole).toHaveBeenCalledWith(SUPERADMIN, {
        role: 'ADMIN_PORTAL',
        scopePortalId: 'portal-a',
        scopeCommerceId: null,
      });
      expect(user).toMatchObject({ email: input.email, role: 'ADMIN_PORTAL', scopePortalId: 'portal-a' });
      expect(user).not.toHaveProperty('passwordHash');
      expect(auditService.record).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ action: 'USER_CREATED', targetType: 'USER', targetId: 'user-1' }),
      );
    });

    it('throws ConflictException when the email is already taken', async () => {
      (usersRepository.findOneBy as jest.Mock).mockResolvedValue({ id: 'existing' });

      await expect(service.createWithRoleAssignment(SUPERADMIN, input)).rejects.toThrow(ConflictException);
    });

    it('propagates ForbiddenException from ScopeAuthorizationService (e.g. cross-portal escalation)', async () => {
      (usersRepository.findOneBy as jest.Mock).mockResolvedValue(null);
      scopeAuthorization.assertCanAssignRole.mockRejectedValue(new ForbiddenException('nope'));

      await expect(service.createWithRoleAssignment(ADMIN_PORTAL_A, input)).rejects.toThrow(ForbiddenException);
      expect(usersRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    const now = new Date('2026-01-01T00:00:00.000Z');

    it('always allows a user to view their own record, regardless of role', async () => {
      (usersRepository.findOneBy as jest.Mock).mockResolvedValue({
        id: 'actor-2',
        email: 'a@example.com',
        fullName: 'A',
        status: 'ACTIVE',
        createdAt: now,
      });
      (roleAssignmentsRepository.findOneBy as jest.Mock).mockResolvedValue({
        role: 'ADMIN_PORTAL',
        scopeType: 'PORTAL',
        scopePortalId: 'portal-a',
        scopeCommerceId: null,
        userId: 'actor-2',
      });

      const user = await service.findOne('actor-2', ADMIN_PORTAL_A);
      expect(user.email).toBe('a@example.com');
    });

    it('blocks an ADMIN_PORTAL from reading a user scoped to a different portal (BOLA)', async () => {
      (usersRepository.findOneBy as jest.Mock).mockResolvedValue({
        id: 'other-user',
        email: 'b@example.com',
        fullName: 'B',
        status: 'ACTIVE',
        createdAt: now,
      });
      (roleAssignmentsRepository.findOneBy as jest.Mock).mockResolvedValue({
        role: 'ADMIN_PORTAL',
        scopeType: 'PORTAL',
        scopePortalId: 'portal-b',
        scopeCommerceId: null,
        userId: 'other-user',
      });

      await expect(service.findOne('other-user', ADMIN_PORTAL_A)).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException when the user does not exist', async () => {
      (usersRepository.findOneBy as jest.Mock).mockResolvedValue(null);

      await expect(service.findOne('00000000-0000-0000-0000-000000000000', SUPERADMIN)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
