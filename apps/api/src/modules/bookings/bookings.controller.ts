import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';

import {
  CurrentUser,
  type AuthUser,
} from '../../common/decorators/current-user.decorator';
import { Idempotent } from '../../common/decorators/idempotent.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { BookingsService } from './bookings.service';
import {
  CancelBookingDto,
  CreateBookingDto,
  CreateCustomRequestDto,
  QuoteBookingDto,
  RescheduleDto,
} from './dto/bookings.dto';

const FILTERS = ['all', 'active', 'scheduled', 'completed', 'quote'] as const;
type Filter = (typeof FILTERS)[number];

@ApiTags('bookings')
@ApiBearerAuth('access-token')
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookings: BookingsService) {}

  // ── Customer ──
  @Post()
  @Roles(Role.customer)
  @Idempotent() // optional key; avoids duplicate bookings on retry (§A3)
  @ApiOperation({ summary: 'Confirm a booking (no charge taken)' })
  create(@CurrentUser('userId') userId: string, @Body() dto: CreateBookingDto) {
    return this.bookings.createBooking(userId, dto);
  }

  @Post('custom')
  @Roles(Role.customer)
  @ApiOperation({ summary: 'Submit a custom request for an admin quote' })
  createCustom(
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateCustomRequestDto,
  ) {
    return this.bookings.createCustomRequest(userId, dto);
  }

  @Get()
  @Roles(Role.customer)
  @ApiQuery({ name: 'filter', enum: FILTERS, required: false })
  @ApiOperation({ summary: "List the customer's bookings (with filter chips)" })
  list(
    @CurrentUser('userId') userId: string,
    @Query('filter') filter: Filter = 'all',
  ) {
    return this.bookings.listForCustomer(userId, filter);
  }

  @Post(':id/reschedule')
  @Roles(Role.customer)
  @HttpCode(200)
  @ApiOperation({ summary: 'Reschedule a booking to a new time' })
  reschedule(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Body() dto: RescheduleDto,
  ) {
    return this.bookings.reschedule(userId, id, dto.scheduledAt);
  }

  // ── Admin ──
  @Get('admin/all')
  @Roles(Role.admin)
  @ApiQuery({ name: 'filter', enum: FILTERS, required: false })
  @ApiOperation({ summary: 'Admin jobs table (All / Active / Quote / Completed)' })
  listAll(@Query('filter') filter: Filter = 'all') {
    return this.bookings.listAll(filter);
  }

  @Post(':id/quote')
  @Roles(Role.admin)
  @HttpCode(200)
  @ApiOperation({ summary: 'Set the price for a custom request' })
  quote(@Param('id') id: string, @Body() dto: QuoteBookingDto) {
    return this.bookings.quote(id, dto.amount);
  }

  // ── Shared (customer owner / assigned engineer / admin) ──
  @Get(':id')
  @ApiOperation({ summary: 'Get a booking (timeline, address, amounts)' })
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.bookings.getById(user.userId, user.role, id);
  }

  @Post(':id/cancel')
  @Roles(Role.customer, Role.admin)
  @HttpCode(200)
  @ApiOperation({ summary: 'Cancel a booking' })
  cancel(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: CancelBookingDto,
  ) {
    return this.bookings.cancel(user.userId, user.role, id, dto.reason);
  }
}
