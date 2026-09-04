import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { Public } from '../auth/decorators/public.decorator';
import { PublicCommercesQueryDto } from './dto/public-commerces-query.dto';
import { PublicPortalsQueryDto } from './dto/public-portals-query.dto';
import { PublicCatalogService } from './public-catalog.service';

/**
 * The entire public surface `portal-web` (the anonymous public app) is
 * allowed to call — every route here is `@Public()` (docs/frontend/
 * PORTAL_WEB_SOURCE_OF_TRUTH.md, "Public API Architecture"). Deliberately
 * its own controller/module, not extra routes bolted onto `PortalsController`/
 * `CommercesController`: those return the full admin `Portal`/`Commerce`
 * shape and are guarded by `@Roles(...)` — mixing an anonymous route into
 * that controller would be one `@Roles()` typo away from a real BOLA/excessive
 * data exposure bug (OWASP API3). `ThrottlerGuard` still applies globally
 * (APP_GUARD, `app.module.ts`) — `@Public()` only opts out of authentication,
 * never out of rate limiting.
 */
@ApiTags('public')
@Controller('public')
@Public()
export class PublicCatalogController {
  constructor(private readonly publicCatalogService: PublicCatalogService) {}

  @Get('portals')
  @ApiOperation({ summary: 'Lista portales publicados y activos (paginado, búsqueda opcional por nombre)' })
  listPortals(@Query() query: PublicPortalsQueryDto) {
    return this.publicCatalogService.listPortals(query);
  }

  @Get('portals/:id')
  @ApiOperation({ summary: 'Detalle público de un portal — 404 si no existe, no está publicado o está inactivo' })
  getPortal(@Param('id', ParseUUIDPipe) id: string) {
    return this.publicCatalogService.getPortal(id);
  }

  @Get('commerces')
  @ApiOperation({ summary: 'Busca comercios aliados publicados y activos en cualquier portal' })
  searchCommerces(@Query() query: PublicCommercesQueryDto) {
    return this.publicCatalogService.searchCommerces(query);
  }
}
