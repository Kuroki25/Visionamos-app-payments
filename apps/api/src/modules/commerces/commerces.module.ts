import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuditModule } from '../audit/audit.module';
import { CategoryEntity } from '../categories/entities/category.entity';
import { RoleAssignmentsModule } from '../role-assignments/role-assignments.module';
import { CommercesController } from './commerces.controller';
import { CommercesService } from './commerces.service';
import { CommerceEntity } from './entities/commerce.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CommerceEntity, CategoryEntity]), AuditModule, RoleAssignmentsModule],
  controllers: [CommercesController],
  providers: [CommercesService],
  exports: [],
})
export class CommercesModule {}
