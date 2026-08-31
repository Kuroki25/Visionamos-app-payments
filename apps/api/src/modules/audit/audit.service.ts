import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { AuditAction, AuditTargetType, ScopeType } from '@repo/contracts';
import type { EntityManager, Repository } from 'typeorm';

import { AuditEventEntity } from './entities/audit-event.entity';

export interface RecordAuditEventInput {
  actorUserId: string;
  action: AuditAction;
  targetType: AuditTargetType;
  targetId: string;
  scopeType: ScopeType;
  scopePortalId?: string | null;
  scopeCommerceId?: string | null;
  previousValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
}

export interface ListAuditEventsQuery {
  targetType?: AuditTargetType;
  targetId?: string;
  actorUserId?: string;
  skip?: number;
  take?: number;
}

/**
 * Append-only administrative audit trail (BR-046). No update/delete method
 * exists here on purpose — matches the entity, which has no such endpoint.
 */
@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditEventEntity)
    private readonly auditRepository: Repository<AuditEventEntity>,
  ) {}

  /**
   * `manager` is required (not optional) — every caller in this codebase
   * records an audit event as part of the same transaction as the write it
   * describes (create a user, reassign a scope, publish a portal). Forcing
   * the manager keeps that atomicity visible at the call site rather than
   * letting a caller accidentally audit outside the transaction.
   */
  async record(manager: EntityManager, input: RecordAuditEventInput): Promise<void> {
    const repository = manager.getRepository(AuditEventEntity);
    const entity = repository.create({
      actorUserId: input.actorUserId,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId,
      scopeType: input.scopeType,
      scopePortalId: input.scopePortalId ?? null,
      scopeCommerceId: input.scopeCommerceId ?? null,
      previousValue: input.previousValue ?? null,
      newValue: input.newValue ?? null,
      metadata: input.metadata ?? null,
    });
    await repository.save(entity);
  }

  async findMany(query: ListAuditEventsQuery): Promise<AuditEventEntity[]> {
    return this.auditRepository.find({
      where: {
        ...(query.targetType ? { targetType: query.targetType } : {}),
        ...(query.targetId ? { targetId: query.targetId } : {}),
        ...(query.actorUserId ? { actorUserId: query.actorUserId } : {}),
      },
      order: { createdAt: 'DESC' },
      skip: query.skip ?? 0,
      take: Math.min(query.take ?? 50, 200),
    });
  }
}
