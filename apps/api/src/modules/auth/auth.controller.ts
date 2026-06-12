import { Body, Controller, Headers, HttpCode, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { SkipAntiReplay } from '../../common/decorators/skip-anti-replay.decorator';
import { AuthService, type DeviceInfo } from './auth.service';
import {
  LoginDto,
  LogoutDto,
  RefreshDto,
  RegisterDto,
  RequestOtpDto,
  VerifyOtpDto,
} from './dto/auth.dto';

// Stricter limit on all auth endpoints — lockout/backoff on credential and
// OTP abuse (§A5). 10 attempts/minute/IP on top of per-phone OTP throttling.
@Throttle({ default: { limit: 10, ttl: 60_000 } })
@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  private device(id?: string, label?: string): DeviceInfo {
    return { deviceId: id, deviceLabel: label };
  }

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register a customer or engineer account' })
  register(
    @Body() dto: RegisterDto,
    @Headers('x-device-id') deviceId?: string,
    @Headers('x-device-label') deviceLabel?: string,
  ) {
    return this.authService.register(dto, this.device(deviceId, deviceLabel));
  }

  @Public()
  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Email + password login' })
  login(
    @Body() dto: LoginDto,
    @Headers('x-device-id') deviceId?: string,
    @Headers('x-device-label') deviceLabel?: string,
  ) {
    return this.authService.login(dto, this.device(deviceId, deviceLabel));
  }

  @Public()
  @Post('otp/request')
  @HttpCode(200)
  @ApiOperation({ summary: 'Request an SMS login OTP (dev returns the code)' })
  requestOtp(@Body() dto: RequestOtpDto) {
    return this.authService.requestOtp(dto.phone);
  }

  @Public()
  @Post('otp/verify')
  @HttpCode(200)
  @ApiOperation({ summary: 'Verify an SMS login OTP and receive tokens' })
  verifyOtp(
    @Body() dto: VerifyOtpDto,
    @Headers('x-device-id') deviceId?: string,
    @Headers('x-device-label') deviceLabel?: string,
  ) {
    return this.authService.verifyOtp(dto.phone, dto.code, this.device(deviceId, deviceLabel));
  }

  @Public()
  @Post('refresh')
  @HttpCode(200)
  @ApiOperation({ summary: 'Rotate: exchange a refresh token for a fresh pair' })
  refresh(@Body() dto: RefreshDto, @Headers('x-device-id') deviceId?: string) {
    return this.authService.refresh(dto.refreshToken, this.device(deviceId));
  }

  // Anti-replay needs a session signing key; logout may run as the session is
  // being torn down, so it carries the refresh token instead.
  @Post('logout')
  @HttpCode(204)
  @SkipAntiReplay()
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Log out this session (revokes its token family)' })
  async logout(
    @CurrentUser('userId') userId: string,
    @Body() dto: LogoutDto,
  ): Promise<void> {
    await this.authService.logout(userId, dto.refreshToken);
  }

  @Post('logout-all')
  @HttpCode(204)
  @SkipAntiReplay()
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Log out of all sessions/devices' })
  async logoutAll(@CurrentUser('userId') userId: string): Promise<void> {
    await this.authService.logoutAll(userId);
  }
}
