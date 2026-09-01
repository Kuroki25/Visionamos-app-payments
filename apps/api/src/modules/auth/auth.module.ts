import { Module } from '@nestjs/common';

import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';

/**
 * Down to just `GET /auth/me` since the cutover
 * (docs/adr/013-better-auth-migration.md) — login/refresh/logout, `JwtModule`,
 * `AuthService`, and `RefreshTokenEntity` were all JWT-specific machinery,
 * retired once Better Auth's own HTTP surface (`/api/auth/*`) and
 * `BetterAuthSessionGuard` proved themselves end-to-end (Fase 7 rehearsal,
 * the real cutover's own vertical slice).
 */
@Module({
  imports: [UsersModule],
  controllers: [AuthController],
})
export class AuthModule {}
