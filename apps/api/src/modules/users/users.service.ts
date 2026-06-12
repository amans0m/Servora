import { Injectable } from '@nestjs/common';
import type { Prisma, Role, User } from '@prisma/client';

import { CryptoService } from '../../crypto/crypto.service';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
  ) {}

  findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  /** Lookup by the deterministic blind index (email is encrypted at rest). */
  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findFirst({
      where: { emailIndex: this.crypto.blindIndex(email) },
    });
  }

  findByPhone(phone: string): Promise<User | null> {
    return this.prisma.user.findFirst({
      where: { phoneIndex: this.crypto.blindIndex(phone) },
    });
  }

  create(data: Prisma.UserCreateInput): Promise<User> {
    return this.prisma.user.create({ data });
  }

  /** Owner-facing profile: decrypt the user's own PII for display (§A1). */
  async getProfile(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        role: true,
        email: true,
        phone: true,
        status: true,
        createdAt: true,
        customerProfile: true,
        engineerProfile: true,
      },
    });
    if (!user) return null;
    return {
      ...user,
      email: this.crypto.decryptMaybe(user.email),
      phone: this.crypto.decryptMaybe(user.phone),
      customerProfile: user.customerProfile
        ? {
            ...user.customerProfile,
            gstin: this.crypto.decryptMaybe(user.customerProfile.gstin),
          }
        : null,
    };
  }

  existsWithRole(id: string, role: Role): Promise<User | null> {
    return this.prisma.user.findFirst({ where: { id, role } });
  }
}
