import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';

import type { Env } from '../../../config/env.schema';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import type { AccessTokenPayload, AuthenticatedRequestUser } from '../types/authenticated-request-user.type';

/**
 * Global default-deny guard (section 22). Reads the access token from the
 * httpOnly cookie (never from a header/body — see ADR 006) and attaches the
 * principal to `req.user`. A route opts out with @Public().
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request & { user?: AuthenticatedRequestUser }>();
    const token: unknown = request.cookies?.access_token;
    if (typeof token !== 'string' || token.length === 0) {
      throw new UnauthorizedException('Missing access token.');
    }

    try {
      const payload = await this.jwtService.verifyAsync<AccessTokenPayload>(token, {
        secret: this.config.get('JWT_ACCESS_SECRET', { infer: true }),
      });
      // AuthenticatedRequestUser is AccessTokenPayload verbatim (docs/adr/011)
      // — role + scope are both embedded in the token, not resolved here.
      request.user = payload;
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired access token.');
    }
  }
}
