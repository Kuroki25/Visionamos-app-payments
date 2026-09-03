import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type {
  PaymentMethod,
  Transaction,
  TransactionAlert,
  TransactionEvent,
  TransactionEventSource,
  TransactionStatus,
} from '@repo/contracts';
import { randomUUID } from 'node:crypto';
import { In, type Repository } from 'typeorm';

import type { AuthenticatedRequestUser } from '../auth/types/authenticated-request-user.type';
import { CommerceEntity } from '../commerces/entities/commerce.entity';
import { ScopeAuthorizationService } from '../role-assignments/scope-authorization.service';
import { ServiceEntity } from '../services/entities/service.entity';
import { TransactionAlertReadEntity } from './entities/transaction-alert-read.entity';
import { TransactionEventEntity } from './entities/transaction-event.entity';
import { TransactionEntity } from './entities/transaction.entity';

export interface CreateTransactionInput {
  serviceId: string;
  formSubmissionId?: string | null;
  payerEmail: string;
  payerDocumentType: string;
  payerDocumentNumber: string;
  payerFirstName: string;
  payerLastName: string;
  payerPhone: string;
  amount: number;
  currency?: string;
  method: PaymentMethod;
}

/** docs/adr/012 — CREATED/PENDING/PROCESSING are the only non-terminal states; every other state has no outgoing edge. */
const VALID_TRANSITIONS: Record<TransactionStatus, TransactionStatus[]> = {
  CREATED: ['PENDING', 'PROCESSING', 'FAILED', 'CANCELLED'],
  PENDING: ['PROCESSING', 'APPROVED', 'REJECTED', 'FAILED', 'CANCELLED'],
  PROCESSING: ['APPROVED', 'REJECTED', 'FAILED'],
  APPROVED: [],
  REJECTED: [],
  FAILED: [],
  CANCELLED: [],
};

function toTransaction(entity: TransactionEntity): Transaction {
  return {
    id: entity.id,
    portalId: entity.portalId,
    commerceId: entity.commerceId,
    serviceId: entity.serviceId,
    formSubmissionId: entity.formSubmissionId,
    payerEmail: entity.payerEmail,
    payerDocumentType: entity.payerDocumentType,
    payerDocumentNumber: entity.payerDocumentNumber,
    payerFirstName: entity.payerFirstName,
    payerLastName: entity.payerLastName,
    payerPhone: entity.payerPhone,
    amount: entity.amount,
    currency: entity.currency,
    method: entity.method,
    status: entity.status,
    internalReference: entity.internalReference,
    providerReference: entity.providerReference,
    createdAt: entity.createdAt.toISOString(),
    updatedAt: entity.updatedAt.toISOString(),
  };
}

function toTransactionEvent(entity: TransactionEventEntity): TransactionEvent {
  return {
    id: entity.id,
    transactionId: entity.transactionId,
    previousStatus: entity.previousStatus,
    newStatus: entity.newStatus,
    source: entity.source,
    metadata: entity.metadata,
    occurredAt: entity.occurredAt.toISOString(),
  };
}

/**
 * No admin endpoint calls `create`/`applyTransition` in this phase —
 * docs/adr/012-transactions-minimal-scope.md. They exist as the internal
 * API the future public payment flow will use once the blocking business
 * decisions (obligation source, providers, currency) are resolved. The
 * controller only exposes reads.
 */
@Injectable()
export class TransactionsService {
  constructor(
    @InjectRepository(TransactionEntity)
    private readonly transactionsRepository: Repository<TransactionEntity>,
    @InjectRepository(TransactionEventEntity)
    private readonly transactionEventsRepository: Repository<TransactionEventEntity>,
    @InjectRepository(ServiceEntity)
    private readonly servicesRepository: Repository<ServiceEntity>,
    @InjectRepository(CommerceEntity)
    private readonly commercesRepository: Repository<CommerceEntity>,
    @InjectRepository(TransactionAlertReadEntity)
    private readonly alertReadsRepository: Repository<TransactionAlertReadEntity>,
    private readonly scopeAuthorization: ScopeAuthorizationService,
  ) {}

  /** Creates a Transaction in CREATED status and its first TransactionEvent (previousStatus: null → CREATED, source: SYSTEM). */
  async create(input: CreateTransactionInput): Promise<Transaction> {
    const service = await this.servicesRepository.findOneBy({ id: input.serviceId });
    if (!service) {
      throw new NotFoundException(`Service ${input.serviceId} not found`);
    }
    const commerce = await this.commercesRepository.findOneBy({ id: service.commerceId });
    if (!commerce) {
      throw new NotFoundException(`Commerce ${service.commerceId} not found`);
    }

    const transaction = await this.transactionsRepository.save(
      this.transactionsRepository.create({
        portalId: commerce.portalId,
        commerceId: commerce.id,
        serviceId: service.id,
        formSubmissionId: input.formSubmissionId ?? null,
        payerEmail: input.payerEmail,
        payerDocumentType: input.payerDocumentType,
        payerDocumentNumber: input.payerDocumentNumber,
        payerFirstName: input.payerFirstName,
        payerLastName: input.payerLastName,
        payerPhone: input.payerPhone,
        amount: input.amount,
        currency: input.currency ?? 'COP',
        method: input.method,
        status: 'CREATED',
        internalReference: `TX-${randomUUID()}`,
        providerReference: null,
      }),
    );

    await this.transactionEventsRepository.save(
      this.transactionEventsRepository.create({
        transactionId: transaction.id,
        previousStatus: null,
        newStatus: 'CREATED',
        source: 'SYSTEM',
        metadata: null,
      }),
    );

    return toTransaction(transaction);
  }

  /** Validates `newStatus` against VALID_TRANSITIONS before writing — never a free `status = ...` update. Always logs a TransactionEventEntity in the same call. */
  async applyTransition(
    transactionId: string,
    newStatus: TransactionStatus,
    source: TransactionEventSource,
    metadata?: Record<string, unknown> | null,
  ): Promise<Transaction> {
    const transaction = await this.transactionsRepository.findOneBy({ id: transactionId });
    if (!transaction) {
      throw new NotFoundException(`Transaction ${transactionId} not found`);
    }

    const allowed = VALID_TRANSITIONS[transaction.status];
    if (!allowed.includes(newStatus)) {
      throw new ConflictException(`Cannot transition a transaction from ${transaction.status} to ${newStatus}.`);
    }

    const previousStatus = transaction.status;
    transaction.status = newStatus;
    const saved = await this.transactionsRepository.save(transaction);

    await this.transactionEventsRepository.save(
      this.transactionEventsRepository.create({
        transactionId: saved.id,
        previousStatus,
        newStatus,
        source,
        metadata: metadata ?? null,
      }),
    );

    return toTransaction(saved);
  }

  /** SUPERADMIN/PORTAL scope see all/their portal's; COMMERCE scope sees only their own commerce's (docs/business/ROLE_PERMISSION_MATRIX.md §5.8). */
  async findAll(actor: AuthenticatedRequestUser): Promise<Transaction[]> {
    if (actor.scopeType === 'PORTAL' && actor.scopePortalId) {
      const transactions = await this.transactionsRepository.find({
        where: { portalId: actor.scopePortalId },
        order: { createdAt: 'DESC' },
      });
      return transactions.map(toTransaction);
    }
    if (actor.scopeType === 'COMMERCE' && actor.scopeCommerceId) {
      const transactions = await this.transactionsRepository.find({
        where: { commerceId: actor.scopeCommerceId },
        order: { createdAt: 'DESC' },
      });
      return transactions.map(toTransaction);
    }
    const transactions = await this.transactionsRepository.find({ order: { createdAt: 'DESC' } });
    return transactions.map(toTransaction);
  }

  async findOne(id: string, actor: AuthenticatedRequestUser): Promise<Transaction> {
    const transaction = await this.loadTransaction(id);
    this.scopeAuthorization.assertScope(actor, { portalId: transaction.portalId, commerceId: transaction.commerceId });
    return toTransaction(transaction);
  }

  async findEvents(id: string, actor: AuthenticatedRequestUser): Promise<TransactionEvent[]> {
    const transaction = await this.loadTransaction(id);
    this.scopeAuthorization.assertScope(actor, { portalId: transaction.portalId, commerceId: transaction.commerceId });

    const events = await this.transactionEventsRepository.find({
      where: { transactionId: id },
      order: { occurredAt: 'ASC' },
    });
    return events.map(toTransactionEvent);
  }

  /**
   * "Alertas de transacciones" (Transacciones page, §17.4) — the same
   * scope-filtered transactions `findAll` returns, each annotated with
   * whether the current actor has already marked it read. Never
   * downloads-all-then-filters-in-frontend: the scope filter runs here,
   * server-side, same as `findAll` (OWASP API1).
   */
  async findAlerts(actor: AuthenticatedRequestUser): Promise<TransactionAlert[]> {
    const transactions = await this.findAll(actor);
    if (transactions.length === 0) {
      return [];
    }

    const reads = await this.alertReadsRepository.find({
      where: { userId: actor.sub, transactionId: In(transactions.map((t) => t.id)) },
    });
    const readIds = new Set(reads.map((r) => r.transactionId));

    return transactions.map((t) => ({ ...t, isRead: readIds.has(t.id) }));
  }

  /**
   * "Marcar todas como leídas". `transactionIds` comes from the client
   * (the alerts it currently has rendered), but is never trusted blindly —
   * intersected against the actor's real, server-computed scope first, so
   * an id outside it is silently dropped rather than recorded (same BOLA
   * posture as every other scoped read here). Idempotent: `upsert` with
   * `ON CONFLICT DO NOTHING` on the (user, transaction) unique pair, so
   * re-marking an already-read alert is a no-op, not an error.
   */
  async markAlertsRead(actor: AuthenticatedRequestUser, transactionIds: string[]): Promise<TransactionAlert[]> {
    const inScope = await this.findAll(actor);
    const inScopeIds = new Set(inScope.map((t) => t.id));
    const validIds = transactionIds.filter((id) => inScopeIds.has(id));

    if (validIds.length > 0) {
      await this.alertReadsRepository.upsert(
        validIds.map((transactionId) => ({ userId: actor.sub, transactionId })),
        { conflictPaths: ['userId', 'transactionId'], skipUpdateIfNoValuesChanged: true },
      );
    }

    return this.findAlerts(actor);
  }

  private async loadTransaction(id: string): Promise<TransactionEntity> {
    const transaction = await this.transactionsRepository.findOneBy({ id });
    if (!transaction) {
      throw new NotFoundException(`Transaction ${id} not found`);
    }
    return transaction;
  }
}
