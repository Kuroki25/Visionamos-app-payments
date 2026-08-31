import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuditModule } from '../audit/audit.module';
import { CommerceEntity } from '../commerces/entities/commerce.entity';
import { RoleAssignmentsModule } from '../role-assignments/role-assignments.module';
import { ServiceEntity } from '../services/entities/service.entity';
import { FormDefinitionEntity } from './entities/form-definition.entity';
import { FormFieldEntity } from './entities/form-field.entity';
import { FormSubmissionEntity } from './entities/form-submission.entity';
import { FormVersionEntity } from './entities/form-version.entity';
import { FormDefinitionsController } from './form-definitions.controller';
import { FormDefinitionsService } from './form-definitions.service';
import { FormFieldsController } from './form-fields.controller';
import { FormFieldsService } from './form-fields.service';
import { FormScopeResolverService } from './form-scope-resolver.service';
import { FormSubmissionsController } from './form-submissions.controller';
import { FormSubmissionsService } from './form-submissions.service';
import { FormVersionsController } from './form-versions.controller';
import { FormVersionsService } from './form-versions.service';

/**
 * Only administrative capture exists here (docs/adr/011 §5) — a public,
 * unauthenticated submission endpoint for the future Portal Público is
 * deliberately out of scope for this pass: it needs its own security
 * decisions (rate limiting without a session, CSRF exemption, anti-
 * enumeration) and will very likely need a `transactionId` FK once the
 * payments module exists. This module's entities/migrations are the
 * backbone that endpoint builds on, not a rewrite waiting to happen.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      FormDefinitionEntity,
      FormVersionEntity,
      FormFieldEntity,
      FormSubmissionEntity,
      ServiceEntity,
      CommerceEntity,
    ]),
    AuditModule,
    RoleAssignmentsModule,
  ],
  controllers: [FormDefinitionsController, FormVersionsController, FormFieldsController, FormSubmissionsController],
  providers: [FormScopeResolverService, FormDefinitionsService, FormVersionsService, FormFieldsService, FormSubmissionsService],
  exports: [],
})
export class FormsModule {}
