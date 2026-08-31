import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { AuthenticatedRequestUser } from '../auth/types/authenticated-request-user.type';
import { UpdateFormVersionDto } from './dto/update-form-version.dto';
import { FormVersionsService } from './form-versions.service';

@ApiTags('forms')
@Controller()
export class FormVersionsController {
  constructor(private readonly formVersionsService: FormVersionsService) {}

  @Post('form-definitions/:formDefinitionId/versions')
  @Roles('SUPERADMIN', 'ADMIN_PORTAL', 'ADMIN_COMMERCE')
  @ApiOperation({ summary: 'Crea una nueva versión en borrador de un formulario' })
  create(
    @Param('formDefinitionId', ParseUUIDPipe) formDefinitionId: string,
    @CurrentUser() actor: AuthenticatedRequestUser,
  ) {
    return this.formVersionsService.create(formDefinitionId, actor);
  }

  @Get('form-definitions/:formDefinitionId/versions')
  @ApiOperation({ summary: 'Lista las versiones de un formulario' })
  findAllForDefinition(
    @Param('formDefinitionId', ParseUUIDPipe) formDefinitionId: string,
    @CurrentUser() actor: AuthenticatedRequestUser,
  ) {
    return this.formVersionsService.findAllForDefinition(formDefinitionId, actor);
  }

  @Get('form-versions/:id')
  @ApiOperation({ summary: 'Obtiene el detalle de una versión de formulario, con sus campos' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: AuthenticatedRequestUser) {
    return this.formVersionsService.findOne(id, actor);
  }

  @Patch('form-versions/:id')
  @Roles('SUPERADMIN', 'ADMIN_PORTAL', 'ADMIN_COMMERCE')
  @ApiOperation({ summary: 'Actualiza el status de una versión de formulario' })
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFormVersionDto,
    @CurrentUser() actor: AuthenticatedRequestUser,
  ) {
    return this.formVersionsService.updateStatus(id, actor, dto.status);
  }

  @Patch('form-versions/:id/publish')
  @Roles('SUPERADMIN', 'ADMIN_PORTAL')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Publica una versión de formulario (despublica cualquier otra vigente)' })
  publish(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: AuthenticatedRequestUser) {
    return this.formVersionsService.publish(id, actor);
  }

  @Patch('form-versions/:id/unpublish')
  @Roles('SUPERADMIN', 'ADMIN_PORTAL')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Despublica una versión de formulario' })
  unpublish(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: AuthenticatedRequestUser) {
    return this.formVersionsService.unpublish(id, actor);
  }
}
