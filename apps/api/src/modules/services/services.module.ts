import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CommerceEntity } from '../commerces/entities/commerce.entity';
import { RoleAssignmentsModule } from '../role-assignments/role-assignments.module';
import { ServiceEntity } from './entities/service.entity';
import { ServicesController } from './services.controller';
import { ServicesService } from './services.service';

@Module({
  imports: [TypeOrmModule.forFeature([ServiceEntity, CommerceEntity]), RoleAssignmentsModule],
  controllers: [ServicesController],
  providers: [ServicesService],
  exports: [],
})
export class ServicesModule {}
