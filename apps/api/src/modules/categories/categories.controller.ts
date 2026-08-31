import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { AuthenticatedRequestUser } from '../auth/types/authenticated-request-user.type';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

// No shared @Controller() base path — categories are addressed both nested
// under their portal (create/list) and standalone by id (read/update), so
// each route declares its own full path (docs/adr/011 §5).
@ApiTags('categories')
@Controller()
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post('portals/:portalId/categories')
  @Roles('SUPERADMIN', 'ADMIN_PORTAL')
  @ApiOperation({ summary: 'Crea una categoría dentro de un portal' })
  create(
    @Param('portalId', ParseUUIDPipe) portalId: string,
    @Body() dto: CreateCategoryDto,
    @CurrentUser() actor: AuthenticatedRequestUser,
  ) {
    return this.categoriesService.create(portalId, actor, dto);
  }

  @Get('portals/:portalId/categories')
  @ApiOperation({ summary: 'Lista las categorías de un portal' })
  findAllForPortal(@Param('portalId', ParseUUIDPipe) portalId: string, @CurrentUser() actor: AuthenticatedRequestUser) {
    return this.categoriesService.findAllForPortal(portalId, actor);
  }

  @Get('categories/:id')
  @ApiOperation({ summary: 'Obtiene el detalle de una categoría' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: AuthenticatedRequestUser) {
    return this.categoriesService.findOne(id, actor);
  }

  @Patch('categories/:id')
  @Roles('SUPERADMIN', 'ADMIN_PORTAL')
  @ApiOperation({ summary: 'Edita una categoría' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCategoryDto,
    @CurrentUser() actor: AuthenticatedRequestUser,
  ) {
    return this.categoriesService.update(id, actor, dto);
  }
}
