import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuditModule } from '../audit/audit.module';
import { CommerceEntity } from '../commerces/entities/commerce.entity';
import { RoleAssignmentEntity } from './entities/role-assignment.entity';
import { RoleAssignmentsController } from './role-assignments.controller';
import { RoleAssignmentsService } from './role-assignments.service';
import { ScopeAuthorizationService } from './scope-authorization.service';

/**
 * `CommerceEntity` is registered directly here (not by importing
 * CommercesModule) — ScopeAuthorizationService only needs its repository to
 * check `commerce.portalId` when an ADMIN_PORTAL creates an
 * ADMIN_COMMERCE; importing the full CommercesModule would create a real
 * module dependency cycle (CommercesModule needs ScopeAuthorizationService
 * too — see commerces.module.ts) for no benefit (docs/adr/011).
 */
@Module({
  imports: [TypeOrmModule.forFeature([RoleAssignmentEntity, CommerceEntity]), AuditModule],
  controllers: [RoleAssignmentsController],
  providers: [RoleAssignmentsService, ScopeAuthorizationService],
  exports: [ScopeAuthorizationService],
})
export class RoleAssignmentsModule {}
