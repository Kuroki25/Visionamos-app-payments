import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuditModule } from '../audit/audit.module';
import { RoleAssignmentsModule } from '../role-assignments/role-assignments.module';
import { PortalEntity } from './entities/portal.entity';
import { PortalsController } from './portals.controller';
import { PortalsService } from './portals.service';

@Module({
  imports: [TypeOrmModule.forFeature([PortalEntity]), AuditModule, RoleAssignmentsModule],
  controllers: [PortalsController],
  providers: [PortalsService],
  exports: [],
})
export class PortalsModule {}
