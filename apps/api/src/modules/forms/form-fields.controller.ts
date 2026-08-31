import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { AuthenticatedRequestUser } from '../auth/types/authenticated-request-user.type';
import { CreateFormFieldDto } from './dto/create-form-field.dto';
import { UpdateFormFieldDto } from './dto/update-form-field.dto';
import { FormFieldsService } from './form-fields.service';

@ApiTags('forms')
@Controller()
export class FormFieldsController {
  constructor(private readonly formFieldsService: FormFieldsService) {}

  @Post('form-versions/:versionId/fields')
  @Roles('SUPERADMIN', 'ADMIN_PORTAL', 'ADMIN_COMMERCE')
  @ApiOperation({ summary: 'Agrega un campo a una versión de formulario en borrador' })
  create(
    @Param('versionId', ParseUUIDPipe) versionId: string,
    @Body() dto: CreateFormFieldDto,
    @CurrentUser() actor: AuthenticatedRequestUser,
  ) {
    return this.formFieldsService.create(versionId, actor, dto);
  }

  @Get('form-versions/:versionId/fields')
  @ApiOperation({ summary: 'Lista los campos de una versión de formulario' })
  findAllForVersion(
    @Param('versionId', ParseUUIDPipe) versionId: string,
    @CurrentUser() actor: AuthenticatedRequestUser,
  ) {
    return this.formFieldsService.findAllForVersion(versionId, actor);
  }

  @Patch('form-fields/:fieldId')
  @Roles('SUPERADMIN', 'ADMIN_PORTAL', 'ADMIN_COMMERCE')
  @ApiOperation({ summary: 'Edita un campo de una versión de formulario en borrador' })
  update(
    @Param('fieldId', ParseUUIDPipe) fieldId: string,
    @Body() dto: UpdateFormFieldDto,
    @CurrentUser() actor: AuthenticatedRequestUser,
  ) {
    return this.formFieldsService.update(fieldId, actor, dto);
  }

  @Delete('form-fields/:fieldId')
  @Roles('SUPERADMIN', 'ADMIN_PORTAL', 'ADMIN_COMMERCE')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Elimina un campo de una versión de formulario en borrador' })
  remove(@Param('fieldId', ParseUUIDPipe) fieldId: string, @CurrentUser() actor: AuthenticatedRequestUser) {
    return this.formFieldsService.remove(fieldId, actor);
  }
}
