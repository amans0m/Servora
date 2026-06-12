import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  AadhaarGenerateOtpDto,
  AadhaarSubmitOtpDto,
  VerifyBankDto,
  VerifyGstDto,
  VerifyPanDto,
} from './dto/kyc.dto';
import { KycService } from './kyc.service';

/**
 * All verification runs server-side (§5). Customers verify GST; engineers run
 * Aadhaar + PAN + bank. Routes are role-gated.
 */
@ApiTags('kyc')
@ApiBearerAuth('access-token')
@Controller('kyc')
export class KycController {
  constructor(private readonly kyc: KycService) {}

  // ── Customer ──
  @Post('gst')
  @Roles(Role.customer)
  @HttpCode(200)
  @ApiOperation({ summary: 'Verify a customer GSTIN (Surepass) and mark GST-verified' })
  verifyGst(@CurrentUser('userId') userId: string, @Body() dto: VerifyGstDto) {
    return this.kyc.verifyCustomerGst(userId, dto.gstin);
  }

  // ── Engineer ──
  @Post('aadhaar/generate-otp')
  @Roles(Role.engineer)
  @HttpCode(200)
  @ApiOperation({ summary: 'Start Aadhaar OKYC — send OTP (returns client_id)' })
  aadhaarGenerate(
    @CurrentUser('userId') userId: string,
    @Body() dto: AadhaarGenerateOtpDto,
  ) {
    return this.kyc.engineerAadhaarGenerateOtp(userId, dto.aadhaar);
  }

  @Post('aadhaar/submit-otp')
  @Roles(Role.engineer)
  @HttpCode(200)
  @ApiOperation({ summary: 'Complete Aadhaar OKYC by submitting the OTP' })
  aadhaarSubmit(
    @CurrentUser('userId') userId: string,
    @Body() dto: AadhaarSubmitOtpDto,
  ) {
    return this.kyc.engineerAadhaarSubmitOtp(userId, dto.clientId, dto.otp);
  }

  @Post('pan')
  @Roles(Role.engineer)
  @HttpCode(200)
  @ApiOperation({ summary: 'Verify engineer PAN' })
  pan(@CurrentUser('userId') userId: string, @Body() dto: VerifyPanDto) {
    return this.kyc.engineerPan(userId, dto.pan);
  }

  @Post('bank')
  @Roles(Role.engineer)
  @HttpCode(200)
  @ApiOperation({ summary: 'Verify engineer bank account (penny-drop)' })
  bank(@CurrentUser('userId') userId: string, @Body() dto: VerifyBankDto) {
    return this.kyc.engineerBank(userId, dto.accountNumber, dto.ifsc);
  }

  @Get('status')
  @Roles(Role.engineer)
  @ApiOperation({ summary: "Engineer's KYC check statuses + approval state" })
  status(@CurrentUser('userId') userId: string) {
    return this.kyc.getEngineerKycStatus(userId);
  }
}
