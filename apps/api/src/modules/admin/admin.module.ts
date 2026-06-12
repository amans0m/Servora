import { Module } from '@nestjs/common';

import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { IntegrationsAdminService } from './integrations.service';

@Module({
  controllers: [AdminController],
  providers: [AdminService, IntegrationsAdminService],
})
export class AdminModule {}
