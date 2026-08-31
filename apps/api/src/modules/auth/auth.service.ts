import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import type { User } from '@repo/contracts';
import * as argon2 from 'argon2';
import { createHash, randomUUID } from 'node:crypto';
import { Repository } from 'typeorm';

import type { Env } from '../../config/env.schema';
import type { RoleAssignmentEntity } from '../role-assignments/entities/role-assignment.entity';
import { UsersService } from '../users/users.service';
import type { UserEntity } from '../users/entities/user.entity';
import { RefreshTokenEntity } from './entities/refresh-token.entity';
import type { AccessTokenPayload, RefreshTokenPayload } from './types/authenticated-request-user.type';

export interface IssuedTokens {
  accessToken: string;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function toUser(user: UserEntity, assignment: RoleAssignmentEntity): User {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: assignment.role,
    scopeType: assignment.scopeType,
    scopePortalId: assignment.scopePortalId,
    scopeCommerceId: assignment.scopeCommerceId,
    status: user.status,
    createdAt: user.createdAt.toISOString(),
  };
}

/**
 * There is no `register` here — Red Coopagos has no public self-registration
 * (docs/adr/006/011). Account creation is `UsersService.createWithRoleAssignment`,
 * an authenticated, role-gated operation (`POST /users`).
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService<Env, true>,
    @InjectRepository(RefreshTokenEntity)
    private readonly refreshTokens: Repository<RefreshTokenEntity>,
  ) {}

  /**
   * Same generic error for "no such user", "wrong password" and "account
   * deactivated" — prevents account enumeration (OWASP A07) from also
   * leaking whether a disabled account exists.
   */
  async validateCredentials(email: string, password: string): Promise<User> {
    const entity = await this.usersService.findEntityByEmailWithPassword(email);
    if (!entity) {
      await argon2.hash(password); // constant-time-ish: don't skip the hash cost
      throw new UnauthorizedException('Invalid email or password.');
    }

    const valid = await argon2.verify(entity.passwordHash, password);
    if (!valid) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const { user, assignment } = await this.usersService.loadUserWithAssignment(entity.id);
    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Invalid email or password.');
    }

    return toUser(user, assignment);
  }

  async issueTokens(user: User): Promise<IssuedTokens> {
    const accessToken = await this.jwtService.signAsync(
      {
        sub: user.id,
        role: user.role,
        scopeType: user.scopeType,
        scopePortalId: user.scopePortalId,
        scopeCommerceId: user.scopeCommerceId,
      } satisfies AccessTokenPayload,
      {
        secret: this.config.get('JWT_ACCESS_SECRET', { infer: true }),
        expiresIn: this.config.get('JWT_ACCESS_TTL', { infer: true }),
      },
    );

    const refreshTokenId = randomUUID();
    const refreshTtlDays = this.config.get('JWT_REFRESH_TTL_DAYS', { infer: true });
    const expiresAt = new Date(Date.now() + refreshTtlDays * 24 * 60 * 60 * 1000);

    const refreshToken = await this.jwtService.signAsync(
      { sub: user.id, jti: refreshTokenId } satisfies RefreshTokenPayload,
      {
        secret: this.config.get('JWT_REFRESH_SECRET', { infer: true }),
        expiresIn: `${refreshTtlDays}d`,
      },
    );

    const record = this.refreshTokens.create({
      id: refreshTokenId,
      userId: user.id,
      tokenHash: hashToken(refreshToken),
      expiresAt,
      revokedAt: null,
    });
    await this.refreshTokens.save(record);

    return { accessToken, refreshToken, refreshTokenExpiresAt: expiresAt };
  }

  /**
   * Rotation: the presented refresh token is revoked whether or not this
   * succeeds. Also the one place (besides login) that re-resolves
   * `role_assignments`/`status` fresh from the database instead of trusting
   * an already-issued access token — bounds the staleness window a
   * reassignment/deactivation can have to at most one access-token TTL
   * (docs/adr/011 §3).
   */
  async rotateRefreshToken(refreshToken: string): Promise<{ user: User; tokens: IssuedTokens }> {
    const payload = await this.verifyRefreshToken(refreshToken);

    const record = await this.refreshTokens.findOneBy({ id: payload.jti });
    const isValid =
      record !== null &&
      record.revokedAt === null &&
      record.expiresAt.getTime() > Date.now() &&
      record.tokenHash === hashToken(refreshToken);

    if (record && record.revokedAt === null) {
      record.revokedAt = new Date();
      await this.refreshTokens.save(record);
    }

    if (!isValid) {
      throw new UnauthorizedException('Invalid refresh token.');
    }

    const { user, assignment } = await this.usersService.loadUserWithAssignment(payload.sub);
    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('This account is no longer active.');
    }

    const freshUser = toUser(user, assignment);
    const tokens = await this.issueTokens(freshUser);
    return { user: freshUser, tokens };
  }

  async revokeRefreshToken(refreshToken: string): Promise<void> {
    try {
      const payload = await this.verifyRefreshToken(refreshToken);
      await this.refreshTokens.update({ id: payload.jti }, { revokedAt: new Date() });
    } catch {
      // Already invalid/garbage/expired — nothing meaningful to revoke.
    }
  }

  private async verifyRefreshToken(refreshToken: string): Promise<RefreshTokenPayload> {
    try {
      return await this.jwtService.verifyAsync<RefreshTokenPayload>(refreshToken, {
        secret: this.config.get('JWT_REFRESH_SECRET', { infer: true }),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token.');
    }
  }
}
