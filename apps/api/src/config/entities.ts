import { AuditEventEntity } from '../modules/audit/entities/audit-event.entity';
import { CategoryEntity } from '../modules/categories/entities/category.entity';
import { CommerceEntity } from '../modules/commerces/entities/commerce.entity';
import { FormDefinitionEntity } from '../modules/forms/entities/form-definition.entity';
import { FormFieldEntity } from '../modules/forms/entities/form-field.entity';
import { FormSubmissionEntity } from '../modules/forms/entities/form-submission.entity';
import { FormVersionEntity } from '../modules/forms/entities/form-version.entity';
import { PortalEntity } from '../modules/portals/entities/portal.entity';
import { RoleAssignmentEntity } from '../modules/role-assignments/entities/role-assignment.entity';
import { ServiceEntity } from '../modules/services/entities/service.entity';
import { TransactionEventEntity } from '../modules/transactions/entities/transaction-event.entity';
import { TransactionEntity } from '../modules/transactions/entities/transaction.entity';
import { UserEntity } from '../modules/users/entities/user.entity';

/**
 * Single source of truth for the entity list — shared by database.module.ts
 * (Nest bootstrap) and data-source.ts (the migration CLI's standalone
 * DataSource), so the schema TypeORM sees in both places can never drift
 * (docs/adr/010). No `RefreshTokenEntity` since the Better Auth cutover
 * (docs/adr/013) — `refresh_tokens` (the table) is dropped by the
 * `AlterUsersForBetterAuthCutover` migration; Better Auth's own `session`
 * table replaces what it did.
 */
export const ENTITIES = [
  UserEntity,
  RoleAssignmentEntity,
  AuditEventEntity,
  PortalEntity,
  CategoryEntity,
  CommerceEntity,
  ServiceEntity,
  FormDefinitionEntity,
  FormVersionEntity,
  FormFieldEntity,
  FormSubmissionEntity,
  TransactionEntity,
  TransactionEventEntity,
];
