import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuditModule } from '../audit/audit.module';
import { CommerceEntity } from '../commerces/entities/commerce.entity';
import { RoleAssignmentEntity } from '../role-assignments/entities/role-assignment.entity';
import { RoleAssignmentsModule } from '../role-assignments/role-assignments.module';
import { UserEntity } from './entities/user.entity';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity, RoleAssignmentEntity, CommerceEntity]),
    AuditModule,
    RoleAssignmentsModule,
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
