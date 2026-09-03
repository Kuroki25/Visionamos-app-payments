import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PORTAL_LOGO_ALLOWED_MIME_TYPES, PORTAL_LOGO_MAX_BYTES } from '@repo/contracts';
import type { Response } from 'express';
import { memoryStorage } from 'multer';

import { Public } from '../auth/decorators/public.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { AuthenticatedRequestUser } from '../auth/types/authenticated-request-user.type';
import { CreatePortalDto } from './dto/create-portal.dto';
import { UpdatePortalDto } from './dto/update-portal.dto';
import { UpdatePortalStatusDto } from './dto/update-portal-status.dto';
import { PortalsService } from './portals.service';

type AllowedLogoMimeType = (typeof PORTAL_LOGO_ALLOWED_MIME_TYPES)[number];

function isAllowedLogoMimeType(mimeType: string): mimeType is AllowedLogoMimeType {
  return (PORTAL_LOGO_ALLOWED_MIME_TYPES as readonly string[]).includes(mimeType);
}

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

  /**
   * Same roles/scope as `update()` — uploading a logo is an edit, not a
   * creation act. `memoryStorage()`: the buffer is validated (real magic
   * bytes, not just this `fileFilter`'s MIME-header check) and written to
   * disk by `PortalsService.uploadLogo`, not by multer directly — keeps
   * the one real disk-write path in the service, not scattered here.
   */
  @Post(':id/logo')
  @Roles('SUPERADMIN', 'ADMIN_PORTAL')
  @UseInterceptors(
    FileInterceptor('logo', {
      storage: memoryStorage(),
      limits: { fileSize: PORTAL_LOGO_MAX_BYTES },
      fileFilter: (_req, file, callback) => {
        if (!isAllowedLogoMimeType(file.mimetype)) {
          callback(new BadRequestException('Logo must be PNG, JPEG, or WebP.'), false);
          return;
        }
        callback(null, true);
      },
    }),
  )
  @ApiOperation({ summary: 'Sube/reemplaza el logotipo de un portal (PNG/JPEG/WebP, máx. 5MB)' })
  async uploadLogo(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() actor: AuthenticatedRequestUser,
  ) {
    if (!file) {
      throw new BadRequestException('No logo file was provided.');
    }
    return this.portalsService.uploadLogo(id, actor, file);
  }

  /**
   * Deliberately `@Public()` — see `PortalsService.getLogoAbsolutePath`'s
   * docblock for why. `res.sendFile` (Express, via `@nestjs/platform-express`)
   * sets `Content-Type` from the extension and handles range requests —
   * the standard NestJS pattern for serving a file, not a second HTTP
   * client or a hand-rolled stream.
   */
  @Get(':id/logo')
  @Public()
  @ApiOperation({ summary: 'Sirve el logotipo de un portal (público — ver docblock del servicio)' })
  async getLogo(@Param('id', ParseUUIDPipe) id: string, @Res() res: Response) {
    const absolutePath = await this.portalsService.getLogoAbsolutePath(id);
    res.sendFile(absolutePath);
  }
}
