import type { INestApplication } from '@nestjs/common';
import type { Transaction } from '@repo/contracts';

import type { CreateTransactionInput } from '../../src/modules/transactions/transactions.service';
import { TransactionsService } from '../../src/modules/transactions/transactions.service';

/**
 * There is no `POST /transactions` — docs/adr/012-transactions-minimal-scope.md
 * (docs/business/ROLE_PERMISSION_MATRIX.md §5.8: "Crear manualmente: ❌"
 * for every role). This calls the same internal `TransactionsService.create`
 * the future public payment flow will use, via the app's real DI container
 * — the one legitimate way a Transaction fixture can exist for these tests,
 * same reasoning as `seedSuperadmin` for the first AppUser.
 */
export async function seedTransaction(app: INestApplication, input: CreateTransactionInput): Promise<Transaction> {
  const transactionsService = app.get(TransactionsService);
  return transactionsService.create(input);
}
