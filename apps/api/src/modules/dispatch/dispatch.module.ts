import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

import { OtpModule } from '../otp/otp.module';
import { DISPATCH_QUEUE } from './dispatch.constants';
import { DispatchController } from './dispatch.controller';
import { DispatchGateway } from './dispatch.gateway';
import { DispatchService } from './dispatch.service';

@Module({
  imports: [OtpModule, BullModule.registerQueue({ name: DISPATCH_QUEUE })],
  controllers: [DispatchController],
  providers: [DispatchService, DispatchGateway],
  exports: [DispatchService],
})
export class DispatchModule {}
