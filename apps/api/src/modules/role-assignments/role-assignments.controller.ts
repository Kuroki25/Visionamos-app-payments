import { Body, Controller, Param, ParseUUIDPipe, Patch } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { AuthenticatedRequestUser } from '../auth/types/authenticated-request-user.type';
import { ReassignScopeDto } from './dto/reassign-scope.dto';
import { RoleAssignmentsService } from './role-assignments.service';

@ApiTags('role-assignments')
@Controller('users')
export class RoleAssignmentsController {
  constructor(private readonly roleAssignmentsService: RoleAssignmentsService) {}

  @Patch(':userId/role-assignment')
  @Roles('SUPERADMIN')
  @ApiOperation({ summary: 'Reasigna rol/alcance de un usuario (solo SUPERADMIN)' })
  reassign(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: ReassignScopeDto,
    @CurrentUser() actor: AuthenticatedRequestUser,
  ) {
    return this.roleAssignmentsService.reassign(actor, userId, dto);
  }
}
