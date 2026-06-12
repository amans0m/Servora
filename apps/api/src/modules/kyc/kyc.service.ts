import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  EngineerApprovalStatus,
  GstStatus,
  KycCheckType,
  KycStatus,
  Prisma,
} from '@prisma/client';

import { AuditService } from '../../common/audit/audit.service';
import { CryptoService } from '../../crypto/crypto.service';
import { PrismaService } from '../../database/prisma.service';
import { maskRef, presentKycRecord } from './entities/kyc-record';
import { SUREPASS_CLIENT, type SurepassClient } from './surepass.client';

@Injectable()
export class KycService {
  private readonly logger = new Logger(KycService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
    private readonly audit: AuditService,
    @Inject(SUREPASS_CLIENT) private readonly surepass: SurepassClient,
  ) {}

  // ── Customer GST (§5.1) ─────────────────────────────────────────────────
  async verifyCustomerGst(userId: string, gstin: string) {
    const customer = await this.prisma.customerProfile.findUnique({
      where: { userId },
    });
    if (!customer) throw new NotFoundException('Customer profile not found');

    const result = await this.surepass.verifyGstin(gstin);

    if (!result.verified || !result.active) {
      await this.prisma.customerProfile.update({
        where: { id: customer.id },
        data: { gstStatus: GstStatus.failed },
      });
      await this.recordKyc({
        customerId: customer.id,
        type: KycCheckType.gst,
        status: KycStatus.failed,
        maskedRef: maskRef(gstin),
      });
      // Block completion but allow retry / manual review (§5.1).
      throw new BadRequestException(
        result.verified
          ? 'GSTIN is not active. Please check the number or request manual review.'
          : 'GSTIN could not be verified. Please re-enter or request manual review.',
      );
    }

    // On success: store only GSTIN, verified legal name and a timestamp (§5.1).
    const updated = await this.prisma.customerProfile.update({
      where: { id: customer.id },
      data: {
        // GSTIN encrypted at rest + blind index for uniqueness/lookup (§A1).
        gstin: this.crypto.encrypt(gstin),
        gstinIndex: this.crypto.blindIndex(gstin),
        verifiedLegalName: result.legalName ?? null,
        gstStatus: GstStatus.verified,
        gstVerifiedAt: new Date(),
      },
    });
    await this.recordKyc({
      customerId: customer.id,
      type: KycCheckType.gst,
      status: KycStatus.passed,
      maskedRef: maskRef(gstin),
    });

    return {
      gstStatus: updated.gstStatus,
      verifiedLegalName: updated.verifiedLegalName,
      // auto-fill hints for the client to confirm (not persisted raw)
      tradeName: result.tradeName,
      registeredAddress: result.address,
      verifiedAt: updated.gstVerifiedAt,
    };
  }

  // ── Engineer Aadhaar OKYC (§5.2) ────────────────────────────────────────
  async engineerAadhaarGenerateOtp(userId: string, aadhaar: string) {
    const engineer = await this.requireEngineer(userId);
    const init = await this.surepass.aadhaarGenerateOtp(aadhaar);
    if (!init.otpSent) {
      throw new BadRequestException('Could not send Aadhaar OTP. Check the number.');
    }
    await this.recordKyc({
      engineerId: engineer.id,
      type: KycCheckType.aadhaar,
      status: KycStatus.pending,
      maskedRef: maskRef(aadhaar),
    });
    // client_id is opaque (not a secret); the app passes it back to submit-otp.
    return { clientId: init.clientId, otpSent: true };
  }

  async engineerAadhaarSubmitOtp(userId: string, clientId: string, otp: string) {
    const engineer = await this.requireEngineer(userId);
    const result = await this.surepass.aadhaarSubmitOtp(clientId, otp);
    await this.recordKyc({
      engineerId: engineer.id,
      type: KycCheckType.aadhaar,
      status: result.verified ? KycStatus.passed : KycStatus.failed,
    });
    if (!result.verified) {
      throw new BadRequestException('Aadhaar OTP verification failed.');
    }
    await this.advanceEngineerApproval(engineer.id);
    return { verified: true };
  }

  async engineerPan(userId: string, pan: string) {
    const engineer = await this.requireEngineer(userId);
    const result = await this.surepass.verifyPan(pan);
    await this.recordKyc({
      engineerId: engineer.id,
      type: KycCheckType.pan,
      status: result.verified ? KycStatus.passed : KycStatus.failed,
      maskedRef: maskRef(pan, 4),
    });
    if (!result.verified) {
      throw new BadRequestException('PAN verification failed.');
    }
    await this.advanceEngineerApproval(engineer.id);
    return { verified: true, fullName: result.fullName };
  }

  async engineerBank(userId: string, accountNumber: string, ifsc: string) {
    const engineer = await this.requireEngineer(userId);
    const result = await this.surepass.verifyBank(accountNumber, ifsc);
    await this.recordKyc({
      engineerId: engineer.id,
      type: KycCheckType.bank,
      status: result.verified ? KycStatus.passed : KycStatus.failed,
      maskedRef: maskRef(accountNumber),
    });
    if (!result.verified) {
      throw new BadRequestException('Bank account verification failed (penny-drop).');
    }
    await this.prisma.engineerProfile.update({
      where: { id: engineer.id },
      data: { bankAccountLast4: accountNumber.slice(-4) },
    });
    await this.advanceEngineerApproval(engineer.id);
    return { verified: true, nameAtBank: result.nameAtBank };
  }

  // ── Status read ──────────────────────────────────────────────────────────
  async getEngineerKycStatus(userId: string) {
    const engineer = await this.requireEngineer(userId);
    const records = await this.prisma.kycRecord.findMany({
      where: { engineerId: engineer.id },
      orderBy: { type: 'asc' },
    });
    return {
      approvalStatus: engineer.approvalStatus,
      checks: records.map(presentKycRecord),
    };
  }

  // ── Gating: all engineer checks pass -> pending admin approval (§5.2) ─────
  private async advanceEngineerApproval(engineerId: string): Promise<void> {
    const records = await this.prisma.kycRecord.findMany({
      where: { engineerId },
    });
    const passed = (t: KycCheckType) =>
      records.some((r) => r.type === t && r.status === KycStatus.passed);
    const allPassed =
      passed(KycCheckType.aadhaar) &&
      passed(KycCheckType.pan) &&
      passed(KycCheckType.bank);
    if (!allPassed) return;

    const engineer = await this.prisma.engineerProfile.findUnique({
      where: { id: engineerId },
    });
    if (engineer?.approvalStatus === EngineerApprovalStatus.pending_kyc) {
      await this.prisma.engineerProfile.update({
        where: { id: engineerId },
        data: { approvalStatus: EngineerApprovalStatus.pending_approval },
      });
      this.logger.log(`Engineer ${engineerId} passed all KYC → pending admin approval`);
    }
  }

  private async requireEngineer(userId: string) {
    const engineer = await this.prisma.engineerProfile.findUnique({
      where: { userId },
    });
    if (!engineer) throw new NotFoundException('Engineer profile not found');
    return engineer;
  }

  /** Find-or-update a KycRecord for a (engineer|customer, type) pair. */
  private async recordKyc(params: {
    engineerId?: string;
    customerId?: string;
    type: KycCheckType;
    status: KycStatus;
    maskedRef?: string;
  }): Promise<void> {
    const where: Prisma.KycRecordWhereInput = { type: params.type };
    if (params.engineerId) where.engineerId = params.engineerId;
    if (params.customerId) where.customerId = params.customerId;

    const existing = await this.prisma.kycRecord.findFirst({ where });
    const data = {
      status: params.status,
      maskedRef: params.maskedRef,
      verifiedAt: params.status === KycStatus.passed ? new Date() : null,
    };
    if (existing) {
      await this.prisma.kycRecord.update({ where: { id: existing.id }, data });
    } else {
      await this.prisma.kycRecord.create({
        data: {
          engineerId: params.engineerId ?? null,
          customerId: params.customerId ?? null,
          type: params.type,
          ...data,
        },
      });
    }

    // Audit every KYC decision (§A9) — masked ref only, never raw documents.
    await this.audit.record({
      action: 'kyc.verify',
      entityType: params.engineerId ? 'engineer' : 'customer',
      entityId: params.engineerId ?? params.customerId ?? null,
      metadata: { type: params.type, status: params.status, maskedRef: params.maskedRef },
    });
  }
}
