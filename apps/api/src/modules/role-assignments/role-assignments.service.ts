import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import type { ReassignScope, RoleAssignment } from '@repo/contracts';
import type { DataSource } from 'typeorm';

import type { AuthenticatedRequestUser } from '../auth/types/authenticated-request-user.type';
import { AuditService } from '../audit/audit.service';
import { RoleAssignmentEntity } from './entities/role-assignment.entity';

function toRoleAssignment(entity: RoleAssignmentEntity): RoleAssignment {
  return {
    id: entity.id,
    userId: entity.userId,
    role: entity.role,
    scopeType: entity.scopeType,
    scopePortalId: entity.scopePortalId,
    scopeCommerceId: entity.scopeCommerceId,
    createdAt: entity.createdAt.toISOString(),
    updatedAt: entity.updatedAt.toISOString(),
  };
}

/**
 * Reassignment is SUPERADMIN-only and transactional (docs/adr/011 §3): the
 * row is updated in place (role_assignments holds current state, not
 * history — see the entity's docblock) and the before/after snapshot is
 * recorded in the same transaction as an audit event, so a reassignment can
 * never succeed without leaving a trace.
 */
@Injectable()
export class RoleAssignmentsService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly auditService: AuditService,
  ) {}

  async reassign(actor: AuthenticatedRequestUser, userId: string, input: ReassignScope): Promise<RoleAssignment> {
    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(RoleAssignmentEntity);
      const current = await repository.findOneBy({ userId });
      if (!current) {
        throw new NotFoundException(`No role assignment found for user ${userId}.`);
      }

      const previousValue = {
        role: current.role,
        scopeType: current.scopeType,
        scopePortalId: current.scopePortalId,
        scopeCommerceId: current.scopeCommerceId,
      };

      current.role = input.role;
      current.scopeType = input.scopeType;
      current.scopePortalId = input.scopePortalId ?? null;
      current.scopeCommerceId = input.scopeCommerceId ?? null;
      const saved = await repository.save(current);

      await this.auditService.record(manager, {
        actorUserId: actor.sub,
        action: 'ROLE_REASSIGNED',
        targetType: 'ROLE_ASSIGNMENT',
        targetId: saved.id,
        scopeType: saved.scopeType,
        scopePortalId: saved.scopePortalId,
        scopeCommerceId: saved.scopeCommerceId,
        previousValue,
        newValue: {
          role: saved.role,
          scopeType: saved.scopeType,
          scopePortalId: saved.scopePortalId,
          scopeCommerceId: saved.scopeCommerceId,
        },
      });

      return toRoleAssignment(saved);
    });
  }
}
