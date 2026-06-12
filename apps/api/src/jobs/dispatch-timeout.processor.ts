import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';

import { DISPATCH_QUEUE } from '../modules/dispatch/dispatch.constants';
import { DispatchService } from '../modules/dispatch/dispatch.service';

/**
 * BullMQ worker for the dispatch queue (§7). Processes `offer-timeout` jobs:
 * when an engineer doesn't answer within the countdown, the offer is marked
 * timed-out and the job moves to the next-best engineer.
 */
@Processor(DISPATCH_QUEUE)
export class DispatchProcessor extends WorkerHost {
  private readonly logger = new Logger(DispatchProcessor.name);

  constructor(private readonly dispatch: DispatchService) {
    super();
  }

  async process(job: Job<{ assignmentId: string; bookingId: string }>): Promise<void> {
    if (job.name !== 'offer-timeout') return;
    const { assignmentId, bookingId } = job.data;
    await this.dispatch.handleOfferTimeout(assignmentId, bookingId);
  }
}
