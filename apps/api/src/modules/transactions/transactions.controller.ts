import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedRequestUser } from '../auth/types/authenticated-request-user.type';
import { TransactionsService } from './transactions.service';

/**
 * Read-only on purpose — no POST/PATCH route exists here.
 * docs/business/ROLE_PERMISSION_MATRIX.md §5.8 confirms, for all four
 * roles without exception: "Crear manualmente: ❌", "Editar monto
 * original: ❌", "Cambiar estado arbitrariamente: ❌". A Transaction can
 * only be created/transitioned by the (not yet built) public payment flow
 * calling TransactionsService directly — see docs/adr/012.
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
