import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CreateIncentiveDto, UpdateIncentiveDto } from './dto/incentives.dto';
import { IncentivesService } from './incentives.service';

@ApiTags('incentives')
@ApiBearerAuth('access-token')
@Controller('incentives')
export class IncentivesController {
  constructor(private readonly incentives: IncentivesService) {}

  // ── Engineer ──
  @Get('me')
  @Roles(Role.engineer)
  @ApiOperation({ summary: 'Tier progress, active quests and recent bonuses' })
  myProgress(@CurrentUser('userId') userId: string) {
    return this.incentives.myProgress(userId);
  }

  // ── Tiers (engineer + admin) ──
  @Get('tiers')
  @Roles(Role.engineer, Role.admin)
  @ApiOperation({ summary: 'Tier definitions (commission + perks)' })
  tiers() {
    return this.incentives.listTiers();
  }

  // ── Admin: programs ──
  @Get()
  @Roles(Role.admin)
  @ApiOperation({ summary: 'List incentive programs' })
  list() {
    return this.incentives.listPrograms();
  }

  @Get('kpis')
  @Roles(Role.admin)
  @ApiOperation({ summary: 'Incentive KPIs (bonuses paid, active programs/quests)' })
  kpis() {
    return this.incentives.kpis();
  }

  @Post()
  @Roles(Role.admin)
  @ApiOperation({ summary: 'Create an incentive program' })
  create(@Body() dto: CreateIncentiveDto) {
    return this.incentives.createProgram(dto);
  }

  @Patch(':id')
  @Roles(Role.admin)
  @ApiOperation({ summary: 'Update an incentive program' })
  update(@Param('id') id: string, @Body() dto: UpdateIncentiveDto) {
    return this.incentives.updateProgram(id, dto);
  }

  @Post(':id/toggle')
  @Roles(Role.admin)
  @ApiOperation({ summary: 'Enable/pause an incentive program (live toggle)' })
  toggle(@Param('id') id: string) {
    return this.incentives.toggleProgram(id);
  }
}
