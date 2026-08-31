import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { AuthenticatedRequestUser } from '../auth/types/authenticated-request-user.type';
import { CreateFormSubmissionDto } from './dto/create-form-submission.dto';
import { FormSubmissionsService } from './form-submissions.service';

// Administrative capture only in this phase — see form-submissions.service.ts
// docblock. VIEWER is excluded from both routes: it's a read-only role and
// this endpoint mutates/reads captured data, not catalog configuration.
@ApiTags('forms')
@Controller('form-versions/:versionId/submissions')
export class FormSubmissionsController {
  constructor(private readonly formSubmissionsService: FormSubmissionsService) {}

  @Post()
  @Roles('SUPERADMIN', 'ADMIN_PORTAL', 'ADMIN_COMMERCE')
  @ApiOperation({ summary: 'Captura una respuesta de formulario (administrativa)' })
  create(
    @Param('versionId', ParseUUIDPipe) versionId: string,
    @Body() dto: CreateFormSubmissionDto,
    @CurrentUser() actor: AuthenticatedRequestUser,
  ) {
    return this.formSubmissionsService.create(versionId, actor, dto);
  }

  @Get()
  @Roles('SUPERADMIN', 'ADMIN_PORTAL', 'ADMIN_COMMERCE')
  @ApiOperation({ summary: 'Lista las respuestas capturadas de una versión de formulario' })
  findAllForVersion(@Param('versionId', ParseUUIDPipe) versionId: string, @CurrentUser() actor: AuthenticatedRequestUser) {
    return this.formSubmissionsService.findAllForVersion(versionId, actor);
  }
}
