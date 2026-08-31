import { RefreshTokenEntity } from '../modules/auth/entities/refresh-token.entity';
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
 * (Nest bootstrap: both the Postgres branch and the SQLite test branch) and
 * data-source.ts (the migration CLI's standalone DataSource), so the schema
 * TypeORM sees in each of the three places can never drift (docs/adr/010).
 */
export const ENTITIES = [
  UserEntity,
  RefreshTokenEntity,
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
