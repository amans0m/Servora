import { Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RateByCustomerDto, RateByEngineerDto } from './dto/ratings.dto';
import { RatingsService } from './ratings.service';

@ApiTags('ratings')
@Controller('ratings')
export class RatingsController {
  constructor(private readonly ratings: RatingsService) {}

  @Post('bookings/:id/customer')
  @Roles(Role.customer)
  @HttpCode(200)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Customer rates the engineer (public) + platform (internal)' })
  rateByCustomer(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Body() dto: RateByCustomerDto,
  ) {
    return this.ratings.rateByCustomer(userId, id, dto);
  }

  @Post('bookings/:id/engineer')
  @Roles(Role.engineer)
  @HttpCode(200)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Engineer rates the customer (admin-only)' })
  rateByEngineer(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Body() dto: RateByEngineerDto,
  ) {
    return this.ratings.rateByEngineer(userId, id, dto);
  }

  @Public()
  @Get('engineers/:id')
  @ApiOperation({ summary: 'Public reviews for an engineer' })
  engineerReviews(@Param('id') id: string) {
    return this.ratings.engineerReviews(id);
  }

  @Public()
  @Get('services/:id')
  @ApiOperation({ summary: 'Public reviews for a service' })
  serviceReviews(@Param('id') id: string) {
    return this.ratings.serviceReviews(id);
  }

  @Get('customers/:id')
  @Roles(Role.admin)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Admin-only: engineer ratings of a customer' })
  customerRatings(@Param('id') id: string) {
    return this.ratings.customerRatings(id);
  }
}
