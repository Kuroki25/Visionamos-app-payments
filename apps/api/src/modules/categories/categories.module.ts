import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { RoleAssignmentsModule } from '../role-assignments/role-assignments.module';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';
import { CategoryEntity } from './entities/category.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CategoryEntity]), RoleAssignmentsModule],
  controllers: [CategoriesController],
  providers: [CategoriesService],
  exports: [],
})
export class CategoriesModule {}
