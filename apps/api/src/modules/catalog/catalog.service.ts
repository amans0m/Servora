import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ServiceCategory } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import type {
  CreateAddonDto,
  CreateServiceDto,
  UpdateAddonDto,
  UpdateServiceDto,
} from './dto/catalog.dto';

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Public ────────────────────────────────────────────────────────────────
  /** Active services for the marketing site / customer app. */
  listPublic(category?: ServiceCategory) {
    return this.prisma.service.findMany({
      where: { active: true, ...(category ? { category } : {}) },
      include: { addons: { where: { active: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async getBySlug(slug: string) {
    const service = await this.prisma.service.findUnique({
      where: { slug },
      include: { addons: { where: { active: true } } },
    });
    if (!service || !service.active) {
      throw new NotFoundException('Service not found');
    }
    return service;
  }

  // ── Admin ───────────────────────────────────────────────────────────────
  /** Full catalog incl. inactive services (admin table). */
  listAll() {
    return this.prisma.service.findMany({
      include: { addons: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  createService(dto: CreateServiceDto) {
    return this.prisma.service.create({
      data: {
        slug: dto.slug,
        name: dto.name,
        category: dto.category,
        description: dto.description,
        basePrice: dto.basePrice,
        estimatedMinutes: dto.estimatedMinutes ?? 60,
        requiredSkills: dto.requiredSkills ?? [],
      },
    });
  }

  async updateService(id: string, dto: UpdateServiceDto) {
    await this.requireService(id);
    return this.prisma.service.update({ where: { id }, data: { ...dto } });
  }

  /** Live toggle — publish/pause a service instantly (admin). */
  async toggleActive(id: string) {
    const service = await this.requireService(id);
    return this.prisma.service.update({
      where: { id },
      data: { active: !service.active },
    });
  }

  async addAddon(serviceId: string, dto: CreateAddonDto) {
    await this.requireService(serviceId);
    return this.prisma.addon.create({ data: { serviceId, ...dto } });
  }

  async updateAddon(addonId: string, dto: UpdateAddonDto) {
    await this.requireAddon(addonId);
    return this.prisma.addon.update({ where: { id: addonId }, data: { ...dto } });
  }

  async deleteAddon(addonId: string) {
    await this.requireAddon(addonId);
    await this.prisma.addon.delete({ where: { id: addonId } });
    return { deleted: true };
  }

  private async requireService(id: string) {
    const service = await this.prisma.service.findUnique({ where: { id } });
    if (!service) throw new NotFoundException('Service not found');
    return service;
  }

  private async requireAddon(id: string) {
    const addon = await this.prisma.addon.findUnique({ where: { id } });
    if (!addon) throw new NotFoundException('Add-on not found');
    return addon;
  }
}
