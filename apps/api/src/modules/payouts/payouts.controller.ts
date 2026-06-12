import { Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { PayoutsService } from './payouts.service';

@ApiTags('payouts')
@ApiBearerAuth('access-token')
@Controller('payouts')
export class PayoutsController {
  constructor(private readonly payouts: PayoutsService) {}

  @Get('me')
  @Roles(Role.engineer)
  @ApiOperation({ summary: 'Engineer earnings: recent payouts + total paid' })
  me(@CurrentUser('userId') userId: string) {
    return this.payouts.listForEngineer(userId);
  }

  // ── Payout management — SUPER-ADMIN ONLY (§A4) ──
  @Get()
  @Roles(Role.super_admin)
  @ApiOperation({ summary: 'List all payouts (reconciliation)' })
  list() {
    return this.payouts.listAll();
  }

  @Post(':id/retry')
  @Roles(Role.super_admin)
  @HttpCode(200)
  @ApiOperation({ summary: 'Re-queue a failed payout' })
  retry(@CurrentUser('userId') adminId: string, @Param('id') id: string) {
    return this.payouts.retry(adminId, id);
  }
}
