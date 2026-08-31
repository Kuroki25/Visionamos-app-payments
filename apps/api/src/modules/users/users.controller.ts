import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { AuthenticatedRequestUser } from '../auth/types/authenticated-request-user.type';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { UsersService } from './users.service';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles('SUPERADMIN', 'ADMIN_PORTAL', 'ADMIN_COMMERCE')
  @ApiOperation({ summary: 'Crea un usuario administrativo (matriz de creación en ADR 011)' })
  create(@Body() dto: CreateUserDto, @CurrentUser() actor: AuthenticatedRequestUser) {
    return this.usersService.createWithRoleAssignment(actor, dto);
  }

  @Get()
  @Roles('SUPERADMIN', 'ADMIN_PORTAL', 'ADMIN_COMMERCE')
  @ApiOperation({ summary: 'Lista usuarios administrativos dentro del scope del actor' })
  findAll(@CurrentUser() actor: AuthenticatedRequestUser) {
    return this.usersService.findAll(actor);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtiene un usuario por id (el propio usuario o dentro del scope de un admin)' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: AuthenticatedRequestUser) {
    return this.usersService.findOne(id, actor);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualiza el nombre de un usuario (el propio usuario o dentro del scope de un admin)' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() actor: AuthenticatedRequestUser,
  ) {
    return this.usersService.update(id, actor, dto);
  }

  @Patch(':id/status')
  @Roles('SUPERADMIN', 'ADMIN_PORTAL', 'ADMIN_COMMERCE')
  @ApiOperation({ summary: 'Activa/desactiva un usuario dentro del scope del actor' })
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserStatusDto,
    @CurrentUser() actor: AuthenticatedRequestUser,
  ) {
    return this.usersService.updateStatus(id, actor, dto.status);
  }
}
