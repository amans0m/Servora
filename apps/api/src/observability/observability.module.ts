import { Global, Module } from '@nestjs/common';

import { SecurityEventsService } from './security-events.service';

/** Global so auth + guards can emit security/anomaly events (§A9). */
@Global()
@Module({
  providers: [SecurityEventsService],
  exports: [SecurityEventsService],
})
export class ObservabilityModule {}
