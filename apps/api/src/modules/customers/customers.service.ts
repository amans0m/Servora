import { Injectable, NotFoundException } from '@nestjs/common';
import type { Address } from '@prisma/client';

import { CryptoService } from '../../crypto/crypto.service';
import { PrismaService } from '../../database/prisma.service';
import type {
  CreateAddressDto,
  UpdateAddressDto,
  UpdateCustomerDto,
} from './dto/customers.dto';

@Injectable()
export class CustomersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
  ) {}

  async getByUserId(userId: string) {
    const profile = await this.prisma.customerProfile.findUnique({
      where: { userId },
      include: { addresses: { orderBy: { createdAt: 'asc' } } },
    });
    if (!profile) throw new NotFoundException('Customer profile not found');
    // Decrypt the owner's own PII for display (§A1).
    return {
      ...profile,
      gstin: this.crypto.decryptMaybe(profile.gstin),
      addresses: profile.addresses.map((a) => this.decryptAddress(a)),
    };
  }

  /** Decrypt the PII fields of an address for the owner. */
  private decryptAddress(a: Address) {
    return {
      ...a,
      line1: this.crypto.decryptMaybe(a.line1),
      line2: this.crypto.decryptMaybe(a.line2),
      pincode: this.crypto.decryptMaybe(a.pincode),
    };
  }

  async update(userId: string, dto: UpdateCustomerDto) {
    const profile = await this.requireProfile(userId);
    return this.prisma.customerProfile.update({
      where: { id: profile.id },
      data: { companyName: dto.companyName ?? undefined },
    });
  }

  async listAddresses(userId: string) {
    const profile = await this.requireProfile(userId);
    const rows = await this.prisma.address.findMany({
      where: { customerId: profile.id },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((a) => this.decryptAddress(a));
  }

  async createAddress(userId: string, dto: CreateAddressDto) {
    const profile = await this.requireProfile(userId);
    if (dto.isDefault) await this.clearDefault(profile.id);
    const address = await this.prisma.address.create({
      data: {
        customerId: profile.id,
        label: dto.label,
        // Street lines + pincode encrypted at rest (§A1).
        line1: this.crypto.encrypt(dto.line1),
        line2: dto.line2 ? this.crypto.encrypt(dto.line2) : null,
        city: dto.city,
        state: dto.state,
        pincode: this.crypto.encrypt(dto.pincode),
        lat: dto.lat,
        lng: dto.lng,
        isDefault: dto.isDefault ?? false,
      },
    });
    await this.syncGeom(address.id, dto.lng, dto.lat);
    return this.decryptAddress(address);
  }

  async updateAddress(userId: string, addressId: string, dto: UpdateAddressDto) {
    const profile = await this.requireProfile(userId);
    await this.requireOwnedAddress(profile.id, addressId);
    if (dto.isDefault) await this.clearDefault(profile.id);
    const address = await this.prisma.address.update({
      where: { id: addressId },
      data: {
        label: dto.label,
        city: dto.city,
        state: dto.state,
        lat: dto.lat,
        lng: dto.lng,
        isDefault: dto.isDefault,
        ...(dto.line1 !== undefined ? { line1: this.crypto.encrypt(dto.line1) } : {}),
        ...(dto.line2 !== undefined
          ? { line2: dto.line2 ? this.crypto.encrypt(dto.line2) : null }
          : {}),
        ...(dto.pincode !== undefined
          ? { pincode: this.crypto.encrypt(dto.pincode) }
          : {}),
      },
    });
    if (dto.lat !== undefined && dto.lng !== undefined) {
      await this.syncGeom(address.id, dto.lng, dto.lat);
    }
    return this.decryptAddress(address);
  }

  async deleteAddress(userId: string, addressId: string) {
    const profile = await this.requireProfile(userId);
    await this.requireOwnedAddress(profile.id, addressId);
    await this.prisma.address.delete({ where: { id: addressId } });
    return { deleted: true };
  }

  private async requireProfile(userId: string) {
    const profile = await this.prisma.customerProfile.findUnique({
      where: { userId },
    });
    if (!profile) throw new NotFoundException('Customer profile not found');
    return profile;
  }

  private async requireOwnedAddress(customerId: string, addressId: string) {
    const address = await this.prisma.address.findFirst({
      where: { id: addressId, customerId },
    });
    if (!address) throw new NotFoundException('Address not found');
    return address;
  }

  private clearDefault(customerId: string) {
    return this.prisma.address.updateMany({
      where: { customerId, isDefault: true },
      data: { isDefault: false },
    });
  }

  /** Keep the PostGIS point in sync with lat/lng for spatial queries (§8). */
  private async syncGeom(addressId: string, lng: number, lat: number) {
    await this.prisma.$executeRawUnsafe(
      `UPDATE "Address" SET geom = ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography WHERE id = $3`,
      lng,
      lat,
      addressId,
    );
  }
}
