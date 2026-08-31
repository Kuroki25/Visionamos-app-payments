import { ConflictException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';

import { CommerceEntity } from '../commerces/entities/commerce.entity';
import { ScopeAuthorizationService } from '../role-assignments/scope-authorization.service';
import { ServiceEntity } from '../services/entities/service.entity';
import { TransactionEventEntity } from './entities/transaction-event.entity';
import { TransactionEntity } from './entities/transaction.entity';
import { TransactionsService } from './transactions.service';

type MockRepository = Partial<Record<keyof Repository<TransactionEntity>, jest.Mock>>;

function createMockRepository(): MockRepository {
  return {
    create: jest.fn((input: Partial<TransactionEntity>) => input),
    save: jest.fn(),
    find: jest.fn(),
    findOneBy: jest.fn(),
  };
}

// Unit test: the state machine (docs/adr/012 — the only thing this module
// can meaningfully test in isolation, since creation/transition have no
// real caller yet). The real Postgres/SQLite-backed read path is covered
// by test/transactions.e2e-spec.ts.
describe('TransactionsService', () => {
  let service: TransactionsService;
  let transactionsRepository: MockRepository;
  let transactionEventsRepository: MockRepository;

  beforeEach(async () => {
    transactionsRepository = createMockRepository();
    transactionEventsRepository = createMockRepository();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionsService,
        { provide: getRepositoryToken(TransactionEntity), useValue: transactionsRepository },
        { provide: getRepositoryToken(TransactionEventEntity), useValue: transactionEventsRepository },
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
});
