import { Global, Module } from '@nestjs/common';

import { AuditService } from './audit.service';

/** Global so any module can write audit entries (§A9). */
@Global()
@Module({
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
