import { Module } from '@nestjs/common';

import { KycController } from './kyc.controller';
import { KycService } from './kyc.service';
import { HttpSurepassClient, SUREPASS_CLIENT } from './surepass.client';

/**
 * KYC module. The Surepass wrapper is bound to the SUREPASS_CLIENT token so it
 * can be swapped for a fake in tests (§5). HttpSurepassClient auto-falls back
 * to deterministic mock responses when no token is configured.
 */
@Module({
  controllers: [KycController],
  providers: [
    KycService,
    { provide: SUREPASS_CLIENT, useClass: HttpSurepassClient },
  ],
  exports: [KycService],
})
export class KycModule {}
