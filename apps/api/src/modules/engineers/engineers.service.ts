import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  EngineerApprovalStatus,
  EngineerAvailability,
  Prisma,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { GeoService } from '../../redis/geo.service';
import type {
  AddSkillsDto,
  UpdateEngineerDto,
  UpdateLocationDto,
} from './dto/engineers.dto';

@Injectable()
export class EngineersService {
  private readonly logger = new Logger(EngineersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly geo: GeoService,
  ) {}

  async getByUserId(userId: string) {
    const engineer = await this.prisma.engineerProfile.findUnique({
      where: { userId },
      include: { kycRecords: true },
    });
    if (!engineer) throw new NotFoundException('Engineer profile not found');
    return engineer;
  }

  async update(userId: string, dto: UpdateEngineerDto) {
    const engineer = await this.requireEngineer(userId);
    return this.prisma.engineerProfile.update({
      where: { id: engineer.id },
      data: { fullName: dto.fullName ?? undefined, skills: dto.skills ?? undefined },
    });
  }

  async addSkills(userId: string, dto: AddSkillsDto) {
    const engineer = await this.requireEngineer(userId);
    const merged = Array.from(new Set([...engineer.skills, ...dto.skills]));
    return this.prisma.engineerProfile.update({
      where: { id: engineer.id },
      data: { skills: merged },
    });
  }

  /**
   * Availability toggle. Going online is gated on admin approval (§5.2):
   * an engineer can only receive jobs after KYC passes AND admin approves.
   */
  async setAvailability(userId: string, availability: EngineerAvailability) {
    const engineer = await this.requireEngineer(userId);
    if (
      availability === EngineerAvailability.online &&
      engineer.approvalStatus !== EngineerApprovalStatus.approved
    ) {
      throw new ForbiddenException(
        'You can go online only after your KYC is verified and an admin approves your account.',
      );
    }
    const updated = await this.prisma.engineerProfile.update({
      where: { id: engineer.id },
      data: { availability },
    });

    // Keep the Redis GEO index in sync so dispatch only sees online engineers.
    if (
      availability === EngineerAvailability.online &&
      updated.lat != null &&
      updated.lng != null
    ) {
      await this.geo.upsertEngineer(updated.id, updated.lng, updated.lat);
    } else if (availability === EngineerAvailability.offline) {
      await this.geo.removeEngineer(updated.id);
    }
    return updated;
  }

  async updateLocation(userId: string, dto: UpdateLocationDto) {
    const engineer = await this.requireEngineer(userId);
    await this.prisma.engineerProfile.update({
      where: { id: engineer.id },
      data: { lat: dto.lat, lng: dto.lng, locationUpdatedAt: new Date() },
    });
    await this.prisma.$executeRawUnsafe(
      `UPDATE "EngineerProfile" SET geom = ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography WHERE id = $3`,
      dto.lng,
      dto.lat,
      engineer.id,
    );
    // Reflect into the Redis GEO index while the engineer is online.
    if (engineer.availability === EngineerAvailability.online) {
      await this.geo.upsertEngineer(engineer.id, dto.lng, dto.lat);
    }
    return { ok: true };
  }

  // ── Admin ────────────────────────────────────────────────────────────────
  listPending() {
    return this.prisma.engineerProfile.findMany({
      where: { approvalStatus: EngineerApprovalStatus.pending_approval },
      include: { kycRecords: true, user: { select: { email: true, phone: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  listActive() {
    return this.prisma.engineerProfile.findMany({
      where: { approvalStatus: EngineerApprovalStatus.approved },
      include: { user: { select: { email: true, phone: true } } },
      orderBy: { rating: 'desc' },
    });
  }

  async approve(adminUserId: string, engineerId: string) {
    const engineer = await this.prisma.engineerProfile.findUnique({
      where: { id: engineerId },
    });
    if (!engineer) throw new NotFoundException('Engineer not found');
    if (engineer.approvalStatus !== EngineerApprovalStatus.pending_approval) {
      throw new BadRequestException(
        `Engineer cannot be approved from state '${engineer.approvalStatus}' (KYC must pass first).`,
      );
    }
    const updated = await this.prisma.engineerProfile.update({
      where: { id: engineerId },
      data: {
        approvalStatus: EngineerApprovalStatus.approved,
        approvedAt: new Date(),
        approvedById: adminUserId,
      },
    });
    await this.audit(adminUserId, 'engineer.approve', engineerId);
    this.logger.log(`Engineer ${engineerId} approved by ${adminUserId}`);
    return updated;
  }

  async reject(adminUserId: string, engineerId: string, reason?: string) {
    const engineer = await this.prisma.engineerProfile.findUnique({
      where: { id: engineerId },
    });
    if (!engineer) throw new NotFoundException('Engineer not found');
    const updated = await this.prisma.engineerProfile.update({
      where: { id: engineerId },
      data: {
        approvalStatus: EngineerApprovalStatus.rejected,
        availability: EngineerAvailability.offline,
      },
    });
    await this.audit(adminUserId, 'engineer.reject', engineerId, { reason });
    return updated;
  }

  private async requireEngineer(userId: string) {
    const engineer = await this.prisma.engineerProfile.findUnique({
      where: { userId },
    });
    if (!engineer) throw new NotFoundException('Engineer profile not found');
    return engineer;
  }

  /** Audit-log admin actions on PII/approvals (Security §12). */
  private audit(
    actorId: string,
    action: string,
    entityId: string,
    metadata?: Record<string, unknown>,
  ) {
    return this.prisma.auditLog.create({
      data: {
        actorId,
        action,
        entityType: 'engineer',
        entityId,
        metadata: (metadata ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });
  }
}
