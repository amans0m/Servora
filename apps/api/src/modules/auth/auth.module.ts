import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { LoginOtpStore } from './login-otp.store';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({}), // secrets passed per-sign/verify in AuthService
    UsersModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, LoginOtpStore],
  exports: [AuthService],
})
export class AuthModule {}
