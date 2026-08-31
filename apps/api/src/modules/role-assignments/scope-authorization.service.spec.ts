import { ForbiddenException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import type { AuthenticatedRequestUser } from '../auth/types/authenticated-request-user.type';
import { CommerceEntity } from '../commerces/entities/commerce.entity';
import { ScopeAuthorizationService } from './scope-authorization.service';

const SUPERADMIN: AuthenticatedRequestUser = {
  sub: 'u1',
  role: 'SUPERADMIN',
  scopeType: 'GLOBAL',
  scopePortalId: null,
  scopeCommerceId: null,
};

const ADMIN_PORTAL_A: AuthenticatedRequestUser = {
  sub: 'u2',
  role: 'ADMIN_PORTAL',
  scopeType: 'PORTAL',
  scopePortalId: 'portal-a',
  scopeCommerceId: null,
};

const ADMIN_COMMERCE_X: AuthenticatedRequestUser = {
  sub: 'u3',
  role: 'ADMIN_COMMERCE',
  scopeType: 'COMMERCE',
  scopeCommerceId: 'commerce-x',
  scopePortalId: null,
};

const VIEWER_PORTAL_A: AuthenticatedRequestUser = {
  sub: 'u4',
  role: 'VIEWER',
  scopeType: 'PORTAL',
  scopePortalId: 'portal-a',
  scopeCommerceId: null,
};

describe('ScopeAuthorizationService', () => {
  let service: ScopeAuthorizationService;
  let commercesRepository: { findOneBy: jest.Mock };

  beforeEach(async () => {
    commercesRepository = { findOneBy: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScopeAuthorizationService,
        { provide: getRepositoryToken(CommerceEntity), useValue: commercesRepository },
      ],
    }).compile();
    service = module.get(ScopeAuthorizationService);
  });

  describe('assertScope', () => {
    it('allows GLOBAL scope to access any portal/commerce', () => {
      expect(() => service.assertScope(SUPERADMIN, { portalId: 'anything', commerceId: 'anything' })).not.toThrow();
    });

    it('allows PORTAL scope to access its own portal', () => {
      expect(() => service.assertScope(ADMIN_PORTAL_A, { portalId: 'portal-a' })).not.toThrow();
    });

    it('blocks PORTAL scope from a different portal (BOLA)', () => {
      expect(() => service.assertScope(ADMIN_PORTAL_A, { portalId: 'portal-b' })).toThrow(ForbiddenException);
    });

    it('allows COMMERCE scope to access its own commerce', () => {
      expect(() => service.assertScope(ADMIN_COMMERCE_X, { portalId: 'portal-a', commerceId: 'commerce-x' })).not.toThrow();
    });

    it('blocks COMMERCE scope from a different commerce (BOLA)', () => {
      expect(() => service.assertScope(ADMIN_COMMERCE_X, { portalId: 'portal-a', commerceId: 'commerce-y' })).toThrow(
        ForbiddenException,
      );
    });
  });

  describe('assertCanAssignRole', () => {
    it('SUPERADMIN may assign any role/scope', async () => {
      await expect(
        service.assertCanAssignRole(SUPERADMIN, { role: 'ADMIN_COMMERCE', scopeCommerceId: 'commerce-z' }),
      ).resolves.toBeUndefined();
    });

    it('ADMIN_PORTAL may create an ADMIN_COMMERCE for a commerce inside their own portal', async () => {
      commercesRepository.findOneBy.mockResolvedValue({ id: 'commerce-x', portalId: 'portal-a' });
      await expect(
        service.assertCanAssignRole(ADMIN_PORTAL_A, { role: 'ADMIN_COMMERCE', scopeCommerceId: 'commerce-x' }),
      ).resolves.toBeUndefined();
    });

    it('ADMIN_PORTAL is blocked from creating an ADMIN_COMMERCE for a commerce in another portal', async () => {
      commercesRepository.findOneBy.mockResolvedValue({ id: 'commerce-y', portalId: 'portal-b' });
      await expect(
        service.assertCanAssignRole(ADMIN_PORTAL_A, { role: 'ADMIN_COMMERCE', scopeCommerceId: 'commerce-y' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('ADMIN_PORTAL may create a VIEWER scoped to their own portal', async () => {
      await expect(
        service.assertCanAssignRole(ADMIN_PORTAL_A, { role: 'VIEWER', scopePortalId: 'portal-a' }),
      ).resolves.toBeUndefined();
    });

    it('ADMIN_PORTAL cannot create another ADMIN_PORTAL (no privilege escalation)', async () => {
      await expect(
        service.assertCanAssignRole(ADMIN_PORTAL_A, { role: 'ADMIN_PORTAL', scopePortalId: 'portal-a' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('ADMIN_COMMERCE may create a VIEWER scoped to their own commerce', async () => {
      await expect(
        service.assertCanAssignRole(ADMIN_COMMERCE_X, { role: 'VIEWER', scopeCommerceId: 'commerce-x' }),
      ).resolves.toBeUndefined();
    });

    it('ADMIN_COMMERCE cannot create an ADMIN_COMMERCE (no privilege escalation)', async () => {
      await expect(
        service.assertCanAssignRole(ADMIN_COMMERCE_X, { role: 'ADMIN_COMMERCE', scopeCommerceId: 'commerce-x' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('VIEWER cannot create anyone', async () => {
      await expect(
        service.assertCanAssignRole(VIEWER_PORTAL_A, { role: 'VIEWER', scopePortalId: 'portal-a' }),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
