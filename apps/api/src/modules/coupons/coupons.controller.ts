import { Body, Controller, Get, HttpCode, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';

import { Roles } from '../../common/decorators/roles.decorator';
import { CouponsService } from './coupons.service';
import {
  CreateCouponDto,
  UpdateCouponDto,
  ValidateCouponDto,
} from './dto/coupons.dto';

@ApiTags('coupons')
@ApiBearerAuth('access-token')
@Controller('coupons')
export class CouponsController {
  constructor(private readonly coupons: CouponsService) {}

  // ── Customer: live preview on the confirm-booking screen ──
  @Post('validate')
  @Roles(Role.customer)
  @HttpCode(200)
  @ApiOperation({ summary: 'Validate a coupon and preview the discount' })
  async validate(@Body() dto: ValidateCouponDto) {
    const { coupon, discount } = await this.coupons.validateAndPrice(
      dto.code,
      dto.subtotal,
      dto.category,
    );
    return { code: coupon.code, discountType: coupon.discountType, discount };
  }

  // ── Admin ──
  @Get()
  @Roles(Role.admin)
  @ApiOperation({ summary: 'List all coupons' })
  list() {
    return this.coupons.list();
  }

  @Post()
  @Roles(Role.admin)
  @ApiOperation({ summary: 'Create a coupon' })
  create(@Body() dto: CreateCouponDto) {
    return this.coupons.create(dto);
  }

  @Patch(':id')
  @Roles(Role.admin)
  @ApiOperation({ summary: 'Update a coupon' })
  update(@Param('id') id: string, @Body() dto: UpdateCouponDto) {
    return this.coupons.update(id, dto);
  }

  @Post(':id/toggle')
  @Roles(Role.admin)
  @ApiOperation({ summary: 'Enable/pause a coupon (live toggle)' })
  toggle(@Param('id') id: string) {
    return this.coupons.toggleActive(id);
  }
}
