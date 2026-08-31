import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { AuthenticatedRequestUser } from '../auth/types/authenticated-request-user.type';
import { CreatePortalDto } from './dto/create-portal.dto';
import { UpdatePortalDto } from './dto/update-portal.dto';
import { UpdatePortalStatusDto } from './dto/update-portal-status.dto';
import { PortalsService } from './portals.service';

@ApiTags('portals')
@Controller('portals')
export class PortalsController {
  constructor(private readonly portalsService: PortalsService) {}

  @Post()
  @Roles('SUPERADMIN')
  @ApiOperation({ summary: 'Crea un portal (solo SUPERADMIN)' })
  create(@Body() dto: CreatePortalDto) {
    return this.portalsService.create(dto);
  }

  @Get()
  @Roles('SUPERADMIN', 'ADMIN_PORTAL', 'VIEWER')
  @ApiOperation({ summary: 'Lista portales dentro del scope del actor' })
  findAll(@CurrentUser() actor: AuthenticatedRequestUser) {
    return this.portalsService.findAll(actor);
  }

  @Get(':id')
  @Roles('SUPERADMIN', 'ADMIN_PORTAL', 'VIEWER')
  @ApiOperation({ summary: 'Obtiene el detalle de un portal' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: AuthenticatedRequestUser) {
    return this.portalsService.findOne(id, actor);
  }

  @Patch(':id')
  @Roles('SUPERADMIN', 'ADMIN_PORTAL')
  @ApiOperation({ summary: 'Edita un portal' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePortalDto,
    @CurrentUser() actor: AuthenticatedRequestUser,
  ) {
    return this.portalsService.update(id, actor, dto);
  }

  @Patch(':id/status')
  @Roles('SUPERADMIN', 'ADMIN_PORTAL')
  @ApiOperation({ summary: 'Activa/desactiva un portal' })
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePortalStatusDto,
    @CurrentUser() actor: AuthenticatedRequestUser,
  ) {
    return this.portalsService.updateStatus(id, actor, dto.status);
  }

  @Patch(':id/publish')
  @Roles('SUPERADMIN', 'ADMIN_PORTAL')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Publica un portal en el Portal Público' })
  publish(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: AuthenticatedRequestUser) {
    return this.portalsService.setPublished(id, actor, true);
  }

  @Patch(':id/unpublish')
  @Roles('SUPERADMIN', 'ADMIN_PORTAL')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Despublica un portal del Portal Público' })
  unpublish(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: AuthenticatedRequestUser) {
    return this.portalsService.setPublished(id, actor, false);
  }
}
