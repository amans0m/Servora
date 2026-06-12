import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

import { PAYOUTS_QUEUE } from './payouts.constants';
import { PayoutsController } from './payouts.controller';
import { PayoutsService } from './payouts.service';
import { HttpRazorpayXClient, RAZORPAYX_CLIENT } from './razorpayx.client';

@Module({
  imports: [BullModule.registerQueue({ name: PAYOUTS_QUEUE })],
  controllers: [PayoutsController],
  providers: [
    PayoutsService,
    { provide: RAZORPAYX_CLIENT, useClass: HttpRazorpayXClient },
  ],
  exports: [PayoutsService],
})
export class PayoutsModule {}
