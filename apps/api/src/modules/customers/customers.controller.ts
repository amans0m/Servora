import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CustomersService } from './customers.service';
import {
  CreateAddressDto,
  UpdateAddressDto,
  UpdateCustomerDto,
} from './dto/customers.dto';

@ApiTags('customers')
@ApiBearerAuth('access-token')
@Roles(Role.customer)
@Controller('customers')
export class CustomersController {
  constructor(private readonly customers: CustomersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get the current customer profile + addresses' })
  me(@CurrentUser('userId') userId: string) {
    return this.customers.getByUserId(userId);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update the current customer profile' })
  update(@CurrentUser('userId') userId: string, @Body() dto: UpdateCustomerDto) {
    return this.customers.update(userId, dto);
  }

  @Get('me/addresses')
  @ApiOperation({ summary: 'List the customer addresses' })
  listAddresses(@CurrentUser('userId') userId: string) {
    return this.customers.listAddresses(userId);
  }

  @Post('me/addresses')
  @ApiOperation({ summary: 'Add a service address' })
  createAddress(
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateAddressDto,
  ) {
    return this.customers.createAddress(userId, dto);
  }

  @Patch('me/addresses/:id')
  @ApiOperation({ summary: 'Update a service address' })
  updateAddress(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateAddressDto,
  ) {
    return this.customers.updateAddress(userId, id, dto);
  }

  @Delete('me/addresses/:id')
  @ApiOperation({ summary: 'Delete a service address' })
  deleteAddress(@CurrentUser('userId') userId: string, @Param('id') id: string) {
    return this.customers.deleteAddress(userId, id);
  }
}
