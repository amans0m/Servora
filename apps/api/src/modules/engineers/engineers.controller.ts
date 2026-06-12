import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  AddSkillsDto,
  RejectEngineerDto,
  SetAvailabilityDto,
  UpdateEngineerDto,
  UpdateLocationDto,
} from './dto/engineers.dto';
import { EngineersService } from './engineers.service';

@ApiTags('engineers')
@ApiBearerAuth('access-token')
@Controller('engineers')
export class EngineersController {
  constructor(private readonly engineers: EngineersService) {}

  // ── Engineer self-service ──
  @Get('me')
  @Roles(Role.engineer)
  @ApiOperation({ summary: 'Get the current engineer profile + KYC records' })
  me(@CurrentUser('userId') userId: string) {
    return this.engineers.getByUserId(userId);
  }

  @Patch('me')
  @Roles(Role.engineer)
  @ApiOperation({ summary: 'Update engineer name / skills' })
  update(@CurrentUser('userId') userId: string, @Body() dto: UpdateEngineerDto) {
    return this.engineers.update(userId, dto);
  }

  @Post('me/skills')
  @Roles(Role.engineer)
  @ApiOperation({ summary: 'Add skills to the matching profile' })
  addSkills(@CurrentUser('userId') userId: string, @Body() dto: AddSkillsDto) {
    return this.engineers.addSkills(userId, dto);
  }

  @Post('me/availability')
  @Roles(Role.engineer)
  @ApiOperation({ summary: 'Go online/offline (online requires admin approval)' })
  setAvailability(
    @CurrentUser('userId') userId: string,
    @Body() dto: SetAvailabilityDto,
  ) {
    return this.engineers.setAvailability(userId, dto.availability);
  }

  @Post('me/location')
  @Roles(Role.engineer)
  @ApiOperation({ summary: 'Push the engineer live location' })
  updateLocation(
    @CurrentUser('userId') userId: string,
    @Body() dto: UpdateLocationDto,
  ) {
    return this.engineers.updateLocation(userId, dto);
  }

  // ── Admin: approval workflow (§5.2, Component Brief: Engineers) ──
  @Get('pending')
  @Roles(Role.admin)
  @ApiOperation({ summary: 'List engineers awaiting approval (KYC passed)' })
  pending() {
    return this.engineers.listPending();
  }

  @Get()
  @Roles(Role.admin)
  @ApiOperation({ summary: 'List active (approved) engineers' })
  active() {
    return this.engineers.listActive();
  }

  @Post(':id/approve')
  @Roles(Role.admin)
  @ApiOperation({ summary: 'Approve a pending engineer → can go online' })
  approve(@CurrentUser('userId') adminId: string, @Param('id') id: string) {
    return this.engineers.approve(adminId, id);
  }

  @Post(':id/reject')
  @Roles(Role.admin)
  @ApiOperation({ summary: 'Reject an engineer applicant' })
  reject(
    @CurrentUser('userId') adminId: string,
    @Param('id') id: string,
    @Body() dto: RejectEngineerDto,
  ) {
    return this.engineers.reject(adminId, id, dto.reason);
  }
}
