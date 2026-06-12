import { Module } from '@nestjs/common';

import { EngineersController } from './engineers.controller';
import { EngineersService } from './engineers.service';

@Module({
  controllers: [EngineersController],
  providers: [EngineersService],
  exports: [EngineersService],
})
export class EngineersModule {}
