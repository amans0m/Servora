import { Body, Controller, Get, HttpCode, Param, Post, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { IntegrationProviderKey } from '../../config/integrations-config.service';
import { AdminService } from './admin.service';
import { SaveIntegrationDto, ToggleIntegrationDto } from './dto/admin.dto';
import { IntegrationsAdminService } from './integrations.service';

@ApiTags('admin')
@ApiBearerAuth('access-token')
@Roles(Role.admin)
@Controller('admin')
export class AdminController {
  constructor(
    private readonly admin: AdminService,
    private readonly integrations: IntegrationsAdminService,
  ) {}

  // ── Dashboard & tables ──
  @Get('dashboard')
  @ApiOperation({ summary: 'KPIs, recent jobs, 7-day revenue' })
  dashboard() {
    return this.admin.dashboard();
  }

  @Get('customers')
  @ApiOperation({ summary: 'Customers table (jobs, LTV, engineer-given rating)' })
  customers(@CurrentUser('userId') adminId: string) {
    return this.admin.customers(adminId);
  }

  @Get('transactions')
  @ApiOperation({ summary: 'Payments & payouts reconciliation' })
  transactions() {
    return this.admin.transactions();
  }

  @Get('audit-logs')
  @ApiOperation({ summary: 'Audit log (PII access + admin actions)' })
  auditLogs() {
    return this.admin.auditLogs();
  }

  // ── Integrations (encrypted keys) — SUPER-ADMIN ONLY (§A4) ──
  @Get('integrations')
  @Roles(Role.super_admin)
  @ApiOperation({ summary: 'List integrations (masked status — no secrets)' })
  listIntegrations() {
    return this.integrations.list();
  }

  @Put('integrations/:provider')
  @Roles(Role.super_admin)
  @ApiOperation({ summary: 'Save encrypted keys for a provider' })
  saveIntegration(
    @CurrentUser('userId') adminId: string,
    @Param('provider') provider: IntegrationProviderKey,
    @Body() dto: SaveIntegrationDto,
  ) {
    return this.integrations.save(provider, dto.values, dto.enabled, adminId);
  }

  @Post('integrations/:provider/test')
  @Roles(Role.super_admin)
  @HttpCode(200)
  @ApiOperation({ summary: 'Test a provider key' })
  testIntegration(
    @CurrentUser('userId') adminId: string,
    @Param('provider') provider: IntegrationProviderKey,
  ) {
    return this.integrations.test(provider, adminId);
  }

  @Post('integrations/:provider/toggle')
  @Roles(Role.super_admin)
  @HttpCode(200)
  @ApiOperation({ summary: 'Enable/pause a provider platform-wide' })
  toggleIntegration(
    @CurrentUser('userId') adminId: string,
    @Param('provider') provider: IntegrationProviderKey,
    @Body() dto: ToggleIntegrationDto,
  ) {
    return this.integrations.setEnabled(provider, dto.enabled, adminId);
  }
}
