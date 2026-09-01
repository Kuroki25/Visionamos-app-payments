import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { UsersService } from '../users/users.service';
import { CurrentUser } from './decorators/current-user.decorator';
import type { AuthenticatedRequestUser } from './types/authenticated-request-user.type';

/**
 * Login/refresh/logout are retired (docs/adr/013-better-auth-migration.md,
 * "Actualización 2026-09-01") — Better Auth owns that HTTP surface now
 * (`/api/auth/*`, `mount-better-auth-handler.ts`), not this controller.
 * `/auth/me` survives because it was never JWT machinery to begin with: it
 * just maps whatever `BetterAuthSessionGuard` resolved to `req.user` onto
 * the AppUser profile — identical before and after the cutover.
 */
@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Devuelve el usuario autenticado actual' })
  async me(@CurrentUser() currentUser: AuthenticatedRequestUser) {
    return this.usersService.findOne(currentUser.sub, currentUser);
  }
}
