import {
  Body,
  Controller,
  Headers,
  HttpCode,
  Param,
  Post,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiExcludeEndpoint, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { Role } from '@prisma/client';
import { IsOptional, IsString } from 'class-validator';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { PaymentsService } from './payments.service';

class RefundDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  /** Razorpay capture webhook — verified by signature over the raw body (§6). */
  @Public()
  @Post('webhook')
  @HttpCode(200)
  @ApiExcludeEndpoint()
  webhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-razorpay-signature') signature: string,
  ) {
    const rawBody = req.rawBody?.toString() ?? JSON.stringify(req.body);
    return this.payments.handleWebhook(rawBody, signature ?? '');
  }

  // Refunds are SUPER-ADMIN only and audit-logged (§A4/§A9).
  @Post('bookings/:bookingId/refund')
  @Roles(Role.super_admin)
  @HttpCode(200)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Refund a captured payment' })
  refund(
    @CurrentUser('userId') adminId: string,
    @Param('bookingId') bookingId: string,
    @Body() dto: RefundDto,
  ) {
    return this.payments.refund(bookingId, adminId, dto.reason);
  }
}
