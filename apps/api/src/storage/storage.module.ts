import { Global, Module } from '@nestjs/common';

import { StorageService } from './storage.service';

/** Global S3 storage (signed URLs for proof photos & KYC docs). */
@Global()
@Module({
  providers: [StorageService],
  exports: [StorageService],
})
export class StorageModule {}
