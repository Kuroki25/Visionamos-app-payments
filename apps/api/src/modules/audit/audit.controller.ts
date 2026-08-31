import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuditTargetTypeSchema } from '@repo/contracts';

import { Roles } from '../auth/decorators/roles.decorator';
import { AuditService } from './audit.service';

function parsePositiveInt(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

/** SUPERADMIN only — a scoped view for ADMIN_PORTAL is a future extension, not confirmed by the business (docs/adr/011). */
@ApiTags('audit')
@Controller('audit-events')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @Roles('SUPERADMIN')
  @ApiOperation({ summary: 'Lista eventos de auditoría (solo SUPERADMIN)' })
  findMany(
    @Query('targetType') targetType?: string,
    @Query('targetId') targetId?: string,
    @Query('actorUserId') actorUserId?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    const parsedTargetType = AuditTargetTypeSchema.safeParse(targetType);
    const parsedSkip = parsePositiveInt(skip);
    const parsedTake = parsePositiveInt(take);

    return this.auditService.findMany({
      ...(parsedTargetType.success ? { targetType: parsedTargetType.data } : {}),
      ...(targetId ? { targetId } : {}),
      ...(actorUserId ? { actorUserId } : {}),
      ...(parsedSkip !== undefined ? { skip: parsedSkip } : {}),
      ...(parsedTake !== undefined ? { take: parsedTake } : {}),
    });
  }
}
