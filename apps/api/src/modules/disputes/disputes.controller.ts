import { Body, Controller, Get, HttpCode, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { DisputeStatus, Role } from '@prisma/client';

import {
  CurrentUser,
  type AuthUser,
} from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { DisputesService } from './disputes.service';
import { RaiseDisputeDto, ResolveDisputeDto } from './dto/disputes.dto';

@ApiTags('disputes')
@ApiBearerAuth('access-token')
@Controller('disputes')
export class DisputesController {
  constructor(private readonly disputes: DisputesService) {}

  @Post()
  @Roles(Role.customer, Role.engineer)
  @ApiOperation({ summary: 'Raise a dispute on a booking' })
  raise(@CurrentUser() user: AuthUser, @Body() dto: RaiseDisputeDto) {
    return this.disputes.raise(user.userId, user.role, dto);
  }

  @Get('me')
  @Roles(Role.customer, Role.engineer)
  @ApiOperation({ summary: 'Disputes I raised' })
  mine(@CurrentUser('userId') userId: string) {
    return this.disputes.listMine(userId);
  }

  @Get()
  @Roles(Role.admin)
  @ApiQuery({ name: 'status', enum: DisputeStatus, required: false })
  @ApiOperation({ summary: 'Triage queue — all disputes (admin)' })
  list(@Query('status') status?: DisputeStatus) {
    return this.disputes.listAll(status);
  }

  @Post(':id/resolve')
  @Roles(Role.admin)
  @HttpCode(200)
  @ApiOperation({ summary: 'Resolve or reject a dispute (audit-logged)' })
  resolve(
    @CurrentUser('userId') adminId: string,
    @Param('id') id: string,
    @Body() dto: ResolveDisputeDto,
  ) {
    return this.disputes.resolve(adminId, id, dto);
  }
}
