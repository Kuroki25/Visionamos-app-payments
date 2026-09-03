import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedRequestUser } from '../auth/types/authenticated-request-user.type';
import { MarkAlertsReadDto } from './dto/mark-alerts-read.dto';
import { TransactionsService } from './transactions.service';

/**
 * Read-only on Transaction itself — no POST/PATCH route touches its
 * amount/status/etc. docs/business/ROLE_PERMISSION_MATRIX.md §5.8
 * confirms, for all four roles without exception: "Crear manualmente: ❌",
 * "Editar monto original: ❌", "Cambiar estado arbitrariamente: ❌". A
 * Transaction can only be created/transitioned by the (not yet built)
 * public payment flow calling TransactionsService directly — see
 * docs/adr/012. `alerts/read-all` is the one write this controller does
 * have — it only ever touches `transaction_alert_reads` (a per-viewer
 * marker), never the Transaction row.
 */
@ApiTags('transactions')
@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Get()
  @ApiOperation({ summary: 'Lista transacciones dentro del scope del actor' })
  findAll(@CurrentUser() actor: AuthenticatedRequestUser) {
    return this.transactionsService.findAll(actor);
  }

  // Declared before `:id` — otherwise Nest would match "alerts" as the
  // `:id` route param and fail `ParseUUIDPipe` with a 400 instead of
  // reaching this handler.
  @Get('alerts')
  @ApiOperation({ summary: 'Alertas de transacciones dentro del scope del actor, con estado leído/no-leído real' })
  findAlerts(@CurrentUser() actor: AuthenticatedRequestUser) {
    return this.transactionsService.findAlerts(actor);
  }

  @Post('alerts/read-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Marca como leídas las alertas indicadas (validadas contra el scope real del actor)' })
  markAlertsRead(@Body() dto: MarkAlertsReadDto, @CurrentUser() actor: AuthenticatedRequestUser) {
    return this.transactionsService.markAlertsRead(actor, dto.transactionIds);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtiene el detalle de una transacción' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: AuthenticatedRequestUser) {
    return this.transactionsService.findOne(id, actor);
  }

  @Get(':id/events')
  @ApiOperation({ summary: 'Obtiene el historial de eventos de una transacción' })
  findEvents(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: AuthenticatedRequestUser) {
    return this.transactionsService.findEvents(id, actor);
  }
}
