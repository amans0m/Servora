import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Role, ServiceCategory } from '@prisma/client';

import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CatalogService } from './catalog.service';
import {
  CreateAddonDto,
  CreateServiceDto,
  UpdateAddonDto,
  UpdateServiceDto,
} from './dto/catalog.dto';

@ApiTags('catalog')
@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  // ── Public catalog (marketing site + customer app) ──
  @Public()
  @Get('services')
  @ApiQuery({ name: 'category', enum: ServiceCategory, required: false })
  @ApiOperation({ summary: 'List active services (optionally by category)' })
  list(@Query('category') category?: ServiceCategory) {
    return this.catalog.listPublic(category);
  }

  @Public()
  @Get('services/:slug')
  @ApiOperation({ summary: 'Get a service by slug (with add-ons)' })
  detail(@Param('slug') slug: string) {
    return this.catalog.getBySlug(slug);
  }

  // ── Admin catalog management ──
  @Get('admin/services')
  @Roles(Role.admin)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'List all services incl. paused (admin)' })
  listAll() {
    return this.catalog.listAll();
  }

  @Post('services')
  @Roles(Role.admin)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Create a service' })
  create(@Body() dto: CreateServiceDto) {
    return this.catalog.createService(dto);
  }

  @Patch('services/:id')
  @Roles(Role.admin)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Edit a service scope/price' })
  update(@Param('id') id: string, @Body() dto: UpdateServiceDto) {
    return this.catalog.updateService(id, dto);
  }

  @Post('services/:id/toggle')
  @Roles(Role.admin)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Publish/pause a service (live toggle)' })
  toggle(@Param('id') id: string) {
    return this.catalog.toggleActive(id);
  }

  @Post('services/:id/addons')
  @Roles(Role.admin)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Add an add-on to a service' })
  addAddon(@Param('id') id: string, @Body() dto: CreateAddonDto) {
    return this.catalog.addAddon(id, dto);
  }

  @Patch('addons/:addonId')
  @Roles(Role.admin)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Update an add-on' })
  updateAddon(@Param('addonId') addonId: string, @Body() dto: UpdateAddonDto) {
    return this.catalog.updateAddon(addonId, dto);
  }

  @Delete('addons/:addonId')
  @Roles(Role.admin)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Delete an add-on' })
  deleteAddon(@Param('addonId') addonId: string) {
    return this.catalog.deleteAddon(addonId);
  }
}
