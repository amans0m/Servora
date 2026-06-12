import { Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { DispatchService } from './dispatch.service';
import { AssignManuallyDto } from './dto/dispatch.dto';

/**
 * Admin live-dispatch controls (Component Brief: Live dispatch). Engineers
 * receive/answer offers over the WebSocket gateway, not REST.
 */
@ApiTags('dispatch')
@ApiBearerAuth('access-token')
@Roles(Role.admin)
@Controller('dispatch')
export class DispatchController {
  constructor(private readonly dispatch: DispatchService) {}

  @Get('unassigned')
  @ApiOperation({ summary: 'Jobs awaiting an engineer (unassigned queue)' })
  unassigned() {
    return this.dispatch.unassignedQueue();
  }

  @Get('bookings/:id/candidates')
  @ApiOperation({ summary: 'Best-match engineers ranked by score' })
  candidates(@Param('id') id: string) {
    return this.dispatch.bestMatches(id);
  }

  @Post('bookings/:id/auto-assign')
  @HttpCode(200)
  @ApiOperation({ summary: 'Auto-assign best: offer the top-scored engineer' })
  autoAssign(@Param('id') id: string) {
    return this.dispatch.autoAssignBest(id).then(() => ({ dispatching: true }));
  }

  @Post('bookings/:id/assign')
  @HttpCode(200)
  @ApiOperation({ summary: 'Assign a specific engineer manually' })
  assign(
    @CurrentUser('userId') adminId: string,
    @Param('id') id: string,
    @Body() dto: AssignManuallyDto,
  ) {
    return this.dispatch.assignManually(adminId, id, dto.engineerId);
  }

  @Post('bookings/:id/start')
  @HttpCode(200)
  @ApiOperation({ summary: 'Start auto-dispatch for a confirmed booking' })
  start(@Param('id') id: string) {
    return this.dispatch.startDispatch(id).then(() => ({ dispatching: true }));
  }
}
