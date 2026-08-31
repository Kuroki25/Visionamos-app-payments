import { Controller, Get, HttpCode, HttpStatus, Post, Req, Res, UnauthorizedException, Body } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';

import type { Env } from '../../config/env.schema';
import { UsersService } from '../users/users.service';
import { AuthService, type IssuedTokens } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import { LoginDto } from './dto/login.dto';
import type { AuthenticatedRequestUser } from './types/authenticated-request-user.type';

const ACCESS_COOKIE = 'access_token';
const REFRESH_COOKIE = 'refresh_token';

// No POST /register here — Red Coopagos has no public self-registration
// (docs/adr/006/011). Account creation is POST /users (UsersController),
// authenticated and role-gated.
@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  // Stricter than the API-wide default (section 24) — login is the classic
  // brute-force/credential-stuffing target.
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Inicia sesión con email y contraseña' })
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const user = await this.authService.validateCredentials(dto.email, dto.password);
    const tokens = await this.authService.issueTokens(user);
    this.setSessionCookies(res, tokens);
    return user;
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rota el refresh token y emite un nuevo access token' })
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken: unknown = req.cookies?.[REFRESH_COOKIE];
    if (typeof refreshToken !== 'string' || refreshToken.length === 0) {
      throw new UnauthorizedException('Missing refresh token.');
    }
    const { user, tokens } = await this.authService.rotateRefreshToken(refreshToken);
    this.setSessionCookies(res, tokens);
    return user;
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoca el refresh token y limpia las cookies de sesión' })
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<void> {
    const refreshToken: unknown = req.cookies?.[REFRESH_COOKIE];
    if (typeof refreshToken === 'string' && refreshToken.length > 0) {
      await this.authService.revokeRefreshToken(refreshToken);
    }
    res.clearCookie(ACCESS_COOKIE, { path: '/' });
    res.clearCookie(REFRESH_COOKIE, { path: '/api/v1/auth' });
  }

  @Get('me')
  @ApiOperation({ summary: 'Devuelve el usuario autenticado actual' })
  async me(@CurrentUser() currentUser: AuthenticatedRequestUser) {
    return this.usersService.findOne(currentUser.sub, currentUser);
  }

  private setSessionCookies(res: Response, tokens: IssuedTokens): void {
    const secure = this.config.get('COOKIE_SECURE', { infer: true });

    res.cookie(ACCESS_COOKIE, tokens.accessToken, {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      path: '/',
    });

    // Scoped to /auth so the refresh token never rides along on unrelated
    // API calls — it only needs to reach /auth/refresh and /auth/logout.
    res.cookie(REFRESH_COOKIE, tokens.refreshToken, {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      path: '/api/v1/auth',
      expires: tokens.refreshTokenExpiresAt,
    });
  }
}
