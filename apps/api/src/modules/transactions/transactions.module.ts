import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CommerceEntity } from '../commerces/entities/commerce.entity';
import { RoleAssignmentsModule } from '../role-assignments/role-assignments.module';
import { ServiceEntity } from '../services/entities/service.entity';
import { TransactionAlertReadEntity } from './entities/transaction-alert-read.entity';
import { TransactionEventEntity } from './entities/transaction-event.entity';
import { TransactionEntity } from './entities/transaction.entity';
import { TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';

/**
 * Exports `TransactionsService` — the future Payments module (public
 * payment flow) will import this module to call `.create()`/
 * `.applyTransition()` once the blocking business decisions are resolved
 * (docs/adr/012).
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([TransactionEntity, TransactionEventEntity, TransactionAlertReadEntity, ServiceEntity, CommerceEntity]),
    RoleAssignmentsModule,
  ],
  controllers: [TransactionsController],
  providers: [TransactionsService],
  exports: [TransactionsService],
})
export class TransactionsModule {}
