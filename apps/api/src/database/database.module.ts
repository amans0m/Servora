import { Global, Module } from '@nestjs/common';

import { PrismaService } from './prisma.service';

/** Global so PrismaService is injectable across every module. */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class DatabaseModule {}
