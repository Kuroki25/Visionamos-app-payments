import { Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { AuthenticatedRequestUser } from '../auth/types/authenticated-request-user.type';
import { FormDefinitionsService } from './form-definitions.service';

@ApiTags('forms')
@Controller('services/:serviceId/form-definition')
export class FormDefinitionsController {
  constructor(private readonly formDefinitionsService: FormDefinitionsService) {}

  @Post()
  @Roles('SUPERADMIN', 'ADMIN_PORTAL', 'ADMIN_COMMERCE')
  @ApiOperation({ summary: 'Crea la definición de formulario de un servicio (con su versión #1 en borrador)' })
  create(@Param('serviceId', ParseUUIDPipe) serviceId: string, @CurrentUser() actor: AuthenticatedRequestUser) {
    return this.formDefinitionsService.create(serviceId, actor);
  }

  @Get()
  @ApiOperation({ summary: 'Obtiene la definición de formulario de un servicio' })
  findOne(@Param('serviceId', ParseUUIDPipe) serviceId: string, @CurrentUser() actor: AuthenticatedRequestUser) {
    return this.formDefinitionsService.findForService(serviceId, actor);
  }
}
