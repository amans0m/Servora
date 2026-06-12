import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

import { DispatchModule } from '../modules/dispatch/dispatch.module';
import { DISPATCH_QUEUE } from '../modules/dispatch/dispatch.constants';
import { PayoutsModule } from '../modules/payouts/payouts.module';
import { PAYOUTS_QUEUE } from '../modules/payouts/payouts.constants';
import { DispatchProcessor } from './dispatch-timeout.processor';
import { PayoutProcessor } from './payout.processor';

/**
 * BullMQ processors (§9.2 jobs/). Dispatch offer-timeout (§7) and engineer
 * payout release via RazorpayX (§6). Notify processors arrive in a later phase.
 */
@Module({
  imports: [
    DispatchModule,
    PayoutsModule,
    BullModule.registerQueue({ name: DISPATCH_QUEUE }, { name: PAYOUTS_QUEUE }),
  ],
  providers: [DispatchProcessor, PayoutProcessor],
})
export class JobsModule {}
