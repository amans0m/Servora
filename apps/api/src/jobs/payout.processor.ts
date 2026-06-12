import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';

import { PAYOUTS_QUEUE } from '../modules/payouts/payouts.constants';
import { PayoutsService } from '../modules/payouts/payouts.service';

/** BullMQ worker that sends queued engineer payouts to RazorpayX (§6). */
@Processor(PAYOUTS_QUEUE)
export class PayoutProcessor extends WorkerHost {
  private readonly logger = new Logger(PayoutProcessor.name);

  constructor(private readonly payouts: PayoutsService) {
    super();
  }

  async process(job: Job<{ payoutId: string }>): Promise<void> {
    if (job.name !== 'release') return;
    await this.payouts.processPayout(job.data.payoutId);
  }
}
