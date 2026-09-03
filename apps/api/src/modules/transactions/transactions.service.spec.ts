import { ConflictException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import type { AuthenticatedRequestUser } from '../auth/types/authenticated-request-user.type';
import { CommerceEntity } from '../commerces/entities/commerce.entity';
import { ScopeAuthorizationService } from '../role-assignments/scope-authorization.service';
import { ServiceEntity } from '../services/entities/service.entity';
import { TransactionAlertReadEntity } from './entities/transaction-alert-read.entity';
import { TransactionEventEntity } from './entities/transaction-event.entity';
import { TransactionEntity } from './entities/transaction.entity';
import { TransactionsService } from './transactions.service';

type MockRepository = Partial<Record<string, jest.Mock>>;

function createMockRepository(): MockRepository {
  return {
    create: jest.fn((input: Partial<TransactionEntity>) => input),
    save: jest.fn(),
    find: jest.fn(),
    findOneBy: jest.fn(),
    upsert: jest.fn(),
  };
}

const SUPERADMIN: AuthenticatedRequestUser = {
  sub: 'actor-1',
  role: 'SUPERADMIN',
  scopeType: 'GLOBAL',
  scopePortalId: null,
  scopeCommerceId: null,
};

// Unit test: the state machine (docs/adr/012 — the only thing this module
// can meaningfully test in isolation, since creation/transition have no
// real caller yet). The real Postgres/SQLite-backed read path is covered
// by test/transactions.e2e-spec.ts.
describe('TransactionsService', () => {
  let service: TransactionsService;
  let transactionsRepository: MockRepository;
  let transactionEventsRepository: MockRepository;
  let alertReadsRepository: MockRepository;

  beforeEach(async () => {
    transactionsRepository = createMockRepository();
    transactionEventsRepository = createMockRepository();
    alertReadsRepository = createMockRepository();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionsService,
        { provide: getRepositoryToken(TransactionEntity), useValue: transactionsRepository },
        { provide: getRepositoryToken(TransactionEventEntity), useValue: transactionEventsRepository },
        { provide: getRepositoryToken(TransactionAlertReadEntity), useValue: alertReadsRepository },
        { provide: getRepositoryToken(ServiceEntity), useValue: createMockRepository() },
        { provide: getRepositoryToken(CommerceEntity), useValue: createMockRepository() },
        { provide: ScopeAuthorizationService, useValue: {} },
      ],
    }).compile();

    service = module.get(TransactionsService);
  });

  describe('applyTransition', () => {
    it.each([
      ['CREATED', 'PENDING'],
      ['CREATED', 'PROCESSING'],
      ['CREATED', 'FAILED'],
      ['CREATED', 'CANCELLED'],
      ['PENDING', 'PROCESSING'],
      ['PENDING', 'APPROVED'],
      ['PENDING', 'REJECTED'],
      ['PROCESSING', 'APPROVED'],
      ['PROCESSING', 'REJECTED'],
      ['PROCESSING', 'FAILED'],
    ] as const)('allows %s → %s', async (from, to) => {
      (transactionsRepository.findOneBy as jest.Mock).mockResolvedValue({
        id: 't1',
        status: from,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      });
      (transactionsRepository.save as jest.Mock).mockImplementation((entity) => Promise.resolve(entity));
      (transactionEventsRepository.save as jest.Mock).mockResolvedValue({});

      const result = await service.applyTransition('t1', to, 'SYSTEM');
      expect(result.status).toBe(to);
      expect(transactionEventsRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ previousStatus: from, newStatus: to, source: 'SYSTEM' }),
      );
    });

    it.each([
      ['APPROVED', 'PENDING'],
      ['REJECTED', 'APPROVED'],
      ['FAILED', 'PROCESSING'],
      ['CANCELLED', 'CREATED'],
      ['CREATED', 'APPROVED'],
      ['PROCESSING', 'CANCELLED'],
    ] as const)('rejects the terminal/invalid transition %s → %s', async (from, to) => {
      (transactionsRepository.findOneBy as jest.Mock).mockResolvedValue({
        id: 't1',
        status: from,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      });

      await expect(service.applyTransition('t1', to, 'SYSTEM')).rejects.toThrow(ConflictException);
      expect(transactionsRepository.save).not.toHaveBeenCalled();
      expect(transactionEventsRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('findAlerts', () => {
    const now = new Date('2026-01-01T00:00:00.000Z');
    const tx = (id: string) => ({
      id,
      portalId: 'portal-1',
      commerceId: 'commerce-1',
      serviceId: 'service-1',
      formSubmissionId: null,
      payerEmail: 'a@example.com',
      payerDocumentType: 'CC',
      payerDocumentNumber: '1',
      payerFirstName: 'A',
      payerLastName: 'B',
      payerPhone: '300',
      amount: 1000,
      currency: 'COP',
      method: 'CASH',
      status: 'APPROVED',
      internalReference: `TX-${id}`,
      providerReference: null,
      createdAt: now,
      updatedAt: now,
    });

    it('annotates each in-scope transaction with isRead, true only for rows the actor has marked read', async () => {
      (transactionsRepository.find as jest.Mock).mockResolvedValue([tx('t1'), tx('t2'), tx('t3')]);
      (alertReadsRepository.find as jest.Mock).mockResolvedValue([{ userId: SUPERADMIN.sub, transactionId: 't2' }]);

      const alerts = await service.findAlerts(SUPERADMIN);

      expect(alerts.map((a) => ({ id: a.id, isRead: a.isRead }))).toEqual([
        { id: 't1', isRead: false },
        { id: 't2', isRead: true },
        { id: 't3', isRead: false },
      ]);
    });

    it('short-circuits with an empty array when there is nothing in scope — never queries the reads table needlessly', async () => {
      (transactionsRepository.find as jest.Mock).mockResolvedValue([]);

      const alerts = await service.findAlerts(SUPERADMIN);

      expect(alerts).toEqual([]);
      expect(alertReadsRepository.find).not.toHaveBeenCalled();
    });
  });

  describe('markAlertsRead', () => {
    it('upserts only the ids that are actually within the actor\'s scope — a client-supplied id outside it is silently dropped, never recorded (BOLA)', async () => {
      (transactionsRepository.find as jest.Mock).mockResolvedValue([
        { id: 'in-scope-1', createdAt: new Date(), updatedAt: new Date() },
        { id: 'in-scope-2', createdAt: new Date(), updatedAt: new Date() },
      ]);
      (alertReadsRepository.find as jest.Mock).mockResolvedValue([]);
      (alertReadsRepository.upsert as jest.Mock).mockResolvedValue(undefined);

      await service.markAlertsRead(SUPERADMIN, ['in-scope-1', 'not-in-scope-999']);

      expect(alertReadsRepository.upsert).toHaveBeenCalledWith(
        [{ userId: SUPERADMIN.sub, transactionId: 'in-scope-1' }],
        { conflictPaths: ['userId', 'transactionId'], skipUpdateIfNoValuesChanged: true },
      );
    });

    it('is a no-op (no upsert call) when every requested id is out of scope', async () => {
      (transactionsRepository.find as jest.Mock).mockResolvedValue([]);

      await service.markAlertsRead(SUPERADMIN, ['not-in-scope']);

      expect(alertReadsRepository.upsert).not.toHaveBeenCalled();
    });
  });
});
