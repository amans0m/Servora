import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  BookingStatus,
  EngineerTier,
  IncentiveType,
  Prisma,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import type { CreateIncentiveDto, UpdateIncentiveDto } from './dto/incentives.dto';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

@Injectable()
export class IncentivesService {
  private readonly logger = new Logger(IncentivesService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ── Admin: programs ────────────────────────────────────────────────────────
  listPrograms() {
    return this.prisma.incentive.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async kpis() {
    const [bonusesPaidAgg, activePrograms, activeQuests] = await Promise.all([
      this.prisma.incentiveAward.aggregate({ _sum: { amount: true } }),
      this.prisma.incentive.count({ where: { active: true } }),
      this.prisma.incentive.count({
        where: { active: true, type: IncentiveType.quest },
      }),
    ]);
    return {
      bonusesPaid: Number(bonusesPaidAgg._sum.amount ?? 0),
      activePrograms,
      activeQuests,
    };
  }

  createProgram(dto: CreateIncentiveDto) {
    return this.prisma.incentive.create({
      data: {
        name: dto.name,
        type: dto.type,
        reward: dto.reward,
        criteria: (dto.criteria ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });
  }

  async updateProgram(id: string, dto: UpdateIncentiveDto) {
    await this.requireProgram(id);
    return this.prisma.incentive.update({
      where: { id },
      data: {
        name: dto.name,
        type: dto.type,
        reward: dto.reward,
        criteria: (dto.criteria ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });
  }

  async toggleProgram(id: string) {
    const program = await this.requireProgram(id);
    return this.prisma.incentive.update({
      where: { id },
      data: { active: !program.active },
    });
  }

  // ── Tiers ──────────────────────────────────────────────────────────────────
  listTiers() {
    return this.prisma.tierDefinition.findMany({ orderBy: { priorityRank: 'asc' } });
  }

  // ── Engineer: tier progress + active quests + recent bonuses ──────────────
  async myProgress(userId: string) {
    const engineer = await this.prisma.engineerProfile.findUnique({
      where: { userId },
    });
    if (!engineer) throw new NotFoundException('Engineer profile not found');

    const tiers = await this.prisma.tierDefinition.findMany({
      orderBy: { minJobs: 'asc' },
    });
    const nextTier = tiers.find((t) => t.minJobs > engineer.jobsCompleted);
    const currentDef = tiers.find((t) => t.tier === engineer.tier);

    const [quests, recentAwards, jobsThisWeek] = await Promise.all([
      this.prisma.incentive.findMany({
        where: { active: true, type: IncentiveType.quest },
      }),
      this.prisma.incentiveAward.findMany({
        where: { engineerId: engineer.id },
        orderBy: { awardedAt: 'desc' },
        take: 20,
        include: { incentive: { select: { name: true, type: true } } },
      }),
      this.completedSince(engineer.id, new Date(Date.now() - WEEK_MS)),
    ]);

    return {
      tier: engineer.tier,
      commissionRate: currentDef ? Number(currentDef.commissionRate) : null,
      jobsCompleted: engineer.jobsCompleted,
      nextTier: nextTier
        ? { tier: nextTier.tier, jobsNeeded: nextTier.minJobs - engineer.jobsCompleted }
        : null,
      activeQuests: quests.map((q) => {
        const target = Number((q.criteria as any)?.jobs ?? 0);
        return {
          id: q.id,
          name: q.name,
          reward: Number(q.reward),
          target,
          progress: jobsThisWeek,
          complete: target > 0 && jobsThisWeek >= target,
        };
      }),
      recentAwards,
    };
  }

  // ── Evaluation on job completion (called from the lifecycle close) ────────
  async evaluateOnCompletion(engineerId: string): Promise<void> {
    await this.evaluateTier(engineerId);
    await this.evaluateQuests(engineerId);
  }

  /** Promote the engineer to the highest tier their job count qualifies for. */
  async evaluateTier(engineerId: string): Promise<void> {
    const engineer = await this.prisma.engineerProfile.findUnique({
      where: { id: engineerId },
    });
    if (!engineer) return;
    const tiers = await this.prisma.tierDefinition.findMany({
      orderBy: { minJobs: 'asc' },
    });
    let earned: EngineerTier = engineer.tier;
    for (const t of tiers) {
      if (engineer.jobsCompleted >= t.minJobs) earned = t.tier;
    }
    if (earned !== engineer.tier) {
      await this.prisma.engineerProfile.update({
        where: { id: engineerId },
        data: { tier: earned },
      });
      this.logger.log(`Engineer ${engineerId} promoted to ${earned} tier`);
    }
  }

  /** Award any weekly quest the engineer has just satisfied (idempotent/window). */
  private async evaluateQuests(engineerId: string): Promise<void> {
    const quests = await this.prisma.incentive.findMany({
      where: { active: true, type: IncentiveType.quest },
    });
    if (quests.length === 0) return;
    const windowStart = new Date(Date.now() - WEEK_MS);
    const done = await this.completedSince(engineerId, windowStart);

    for (const quest of quests) {
      const target = Number((quest.criteria as any)?.jobs ?? 0);
      if (target <= 0 || done < target) continue;
      const already = await this.prisma.incentiveAward.findFirst({
        where: { incentiveId: quest.id, engineerId, awardedAt: { gte: windowStart } },
      });
      if (already) continue;
      await this.prisma.incentiveAward.create({
        data: { incentiveId: quest.id, engineerId, amount: quest.reward },
      });
      this.logger.log(
        `Quest '${quest.name}' awarded to engineer ${engineerId} (₹${Number(quest.reward)})`,
      );
    }
  }

  private completedSince(engineerId: string, since: Date) {
    return this.prisma.booking.count({
      where: { engineerId, status: BookingStatus.completed, updatedAt: { gte: since } },
    });
  }

  private async requireProgram(id: string) {
    const program = await this.prisma.incentive.findUnique({ where: { id } });
    if (!program) throw new NotFoundException('Incentive program not found');
    return program;
  }
}
