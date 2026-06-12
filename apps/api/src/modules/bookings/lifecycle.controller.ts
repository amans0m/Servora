import { Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Idempotent } from '../../common/decorators/idempotent.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  AttachProofDto,
  OtpCodeDto,
  PayDto,
  ProofUploadUrlDto,
} from './dto/lifecycle.dto';
import { LifecycleService } from './lifecycle.service';

/**
 * Job completion lifecycle endpoints (§6, §8.1). Engineer drives arrival/proof/
 * close; customer drives pay + OTP reveal.
 */
@ApiTags('bookings')
@ApiBearerAuth('access-token')
@Controller('bookings/:id')
export class LifecycleController {
  constructor(private readonly lifecycle: LifecycleService) {}

  // ── Customer ──
  @Get('start-otp')
  @Roles(Role.customer)
  @ApiOperation({ summary: 'Reveal the start OTP to read out to the engineer' })
  startOtp(@CurrentUser('userId') userId: string, @Param('id') id: string) {
    return this.lifecycle.getStartOtp(userId, id);
  }

  @Post('pay')
  @Roles(Role.customer)
  @HttpCode(200)
  @Idempotent({ required: true }) // payment retries must not double-charge (§A3)
  @ApiOperation({ summary: 'Pay (capture) → reveals the completion OTP' })
  pay(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Body() dto: PayDto,
  ) {
    return this.lifecycle.payAndComplete(userId, id, dto.method, dto.razorpayPaymentId);
  }

  @Get('completion-otp')
  @Roles(Role.customer)
  @ApiOperation({ summary: 'Get the completion OTP (locked until paid)' })
  completionOtp(@CurrentUser('userId') userId: string, @Param('id') id: string) {
    return this.lifecycle.getCompletionOtp(userId, id);
  }

  // ── Engineer ──
  @Post('start')
  @Roles(Role.engineer)
  @HttpCode(200)
  @ApiOperation({ summary: 'Verify the start OTP and begin work' })
  start(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Body() dto: OtpCodeDto,
  ) {
    return this.lifecycle.startJob(userId, id, dto.code);
  }

  @Post('proof/upload-url')
  @Roles(Role.engineer)
  @HttpCode(200)
  @ApiOperation({ summary: 'Get a signed URL to upload a proof photo' })
  proofUrl(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Body() dto: ProofUploadUrlDto,
  ) {
    return this.lifecycle.proofUploadUrl(
      userId,
      id,
      dto.fileName,
      dto.contentType,
      dto.sizeBytes,
    );
  }

  @Post('proof')
  @Roles(Role.engineer)
  @HttpCode(200)
  @ApiOperation({ summary: 'Attach an uploaded proof photo to the job' })
  attachProof(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Body() dto: AttachProofDto,
  ) {
    return this.lifecycle.attachProof(userId, id, dto.key);
  }

  @Post('complete-work')
  @Roles(Role.engineer)
  @HttpCode(200)
  @ApiOperation({ summary: 'Mark work done → customer must pay' })
  completeWork(@CurrentUser('userId') userId: string, @Param('id') id: string) {
    return this.lifecycle.completeWork(userId, id);
  }

  @Post('close')
  @Roles(Role.engineer)
  @HttpCode(200)
  @Idempotent() // optional key; guards against double payout on retry (§A3)
  @ApiOperation({ summary: 'Close the job with the completion OTP → payout' })
  close(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Body() dto: OtpCodeDto,
  ) {
    return this.lifecycle.closeJob(userId, id, dto.code);
  }
}
