import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { AuthenticatedRequestUser } from '../auth/types/authenticated-request-user.type';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { ServicesService } from './services.service';

@ApiTags('services')
@Controller()
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Post('commerces/:commerceId/services')
  @Roles('SUPERADMIN', 'ADMIN_PORTAL', 'ADMIN_COMMERCE')
  @ApiOperation({ summary: 'Crea un servicio dentro de un comercio' })
  create(
    @Param('commerceId', ParseUUIDPipe) commerceId: string,
    @Body() dto: CreateServiceDto,
    @CurrentUser() actor: AuthenticatedRequestUser,
  ) {
    return this.servicesService.create(commerceId, actor, dto);
  }

  @Get('commerces/:commerceId/services')
  @ApiOperation({ summary: 'Lista los servicios de un comercio' })
  findAllForCommerce(
    @Param('commerceId', ParseUUIDPipe) commerceId: string,
    @CurrentUser() actor: AuthenticatedRequestUser,
  ) {
    return this.servicesService.findAllForCommerce(commerceId, actor);
  }

  @Get('services/:id')
  @ApiOperation({ summary: 'Obtiene el detalle de un servicio' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: AuthenticatedRequestUser) {
    return this.servicesService.findOne(id, actor);
  }

  @Patch('services/:id')
  @Roles('SUPERADMIN', 'ADMIN_PORTAL', 'ADMIN_COMMERCE')
  @ApiOperation({ summary: 'Edita un servicio' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateServiceDto,
    @CurrentUser() actor: AuthenticatedRequestUser,
  ) {
    return this.servicesService.update(id, actor, dto);
  }
}
