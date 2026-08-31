import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { RefreshTokenEntity } from './entities/refresh-token.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([RefreshTokenEntity]),
    UsersModule,
    // No default secret/expiry here: AuthService passes them explicitly per
    // call (JWT_ACCESS_SECRET vs JWT_REFRESH_SECRET) — see docs/adr/006.
    JwtModule.register({}),
  ],
  controllers: [AuthController],
  providers: [AuthService],
  // JwtModule is re-exported so AppModule can inject JwtService into the
  // globally-registered JwtAuthGuard (APP_GUARD lives in AppModule's own
  // providers, which can only see AuthModule's exports, not its imports).
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
