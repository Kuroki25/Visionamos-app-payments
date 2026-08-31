import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { AuthenticatedRequestUser } from '../auth/types/authenticated-request-user.type';
import { CommercesService } from './commerces.service';
import { CreateCommerceDto } from './dto/create-commerce.dto';
import { UpdateCommerceDto } from './dto/update-commerce.dto';
import { UpdateCommerceStatusDto } from './dto/update-commerce-status.dto';

@ApiTags('commerces')
@Controller()
export class CommercesController {
  constructor(private readonly commercesService: CommercesService) {}

  @Post('portals/:portalId/commerces')
  @Roles('SUPERADMIN', 'ADMIN_PORTAL')
  @ApiOperation({ summary: 'Crea un comercio aliado dentro de un portal' })
  create(
    @Param('portalId', ParseUUIDPipe) portalId: string,
    @Body() dto: CreateCommerceDto,
    @CurrentUser() actor: AuthenticatedRequestUser,
  ) {
    return this.commercesService.create(portalId, actor, dto);
  }

  @Get('portals/:portalId/commerces')
  @ApiOperation({ summary: 'Lista los comercios de un portal' })
  findAllForPortal(@Param('portalId', ParseUUIDPipe) portalId: string, @CurrentUser() actor: AuthenticatedRequestUser) {
    return this.commercesService.findAllForPortal(portalId, actor);
  }

  @Get('commerces/:id')
  @ApiOperation({ summary: 'Obtiene el detalle de un comercio' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: AuthenticatedRequestUser) {
    return this.commercesService.findOne(id, actor);
  }

  @Patch('commerces/:id')
  @Roles('SUPERADMIN', 'ADMIN_PORTAL')
  @ApiOperation({ summary: 'Edita un comercio' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCommerceDto,
    @CurrentUser() actor: AuthenticatedRequestUser,
  ) {
    return this.commercesService.update(id, actor, dto);
  }

  @Patch('commerces/:id/status')
  @Roles('SUPERADMIN', 'ADMIN_PORTAL')
  @ApiOperation({ summary: 'Activa/desactiva un comercio' })
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCommerceStatusDto,
    @CurrentUser() actor: AuthenticatedRequestUser,
  ) {
    return this.commercesService.updateStatus(id, actor, dto.status);
  }

  @Patch('commerces/:id/publish')
  @Roles('SUPERADMIN', 'ADMIN_PORTAL')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Publica un comercio en el Portal Público' })
  publish(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: AuthenticatedRequestUser) {
    return this.commercesService.setPublished(id, actor, true);
  }

  @Patch('commerces/:id/unpublish')
  @Roles('SUPERADMIN', 'ADMIN_PORTAL')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Despublica un comercio del Portal Público' })
  unpublish(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: AuthenticatedRequestUser) {
    return this.commercesService.setPublished(id, actor, false);
  }
}
