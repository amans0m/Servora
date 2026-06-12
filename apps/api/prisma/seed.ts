import {
  BookingStatus,
  EngineerApprovalStatus,
  EngineerAvailability,
  EngineerTier,
  GstStatus,
  PrismaClient,
  Role,
  ServiceCategory,
} from '@prisma/client';
import * as argon2 from 'argon2';

import { buildCrypto, cryptoOptionsFromEnv } from '../src/crypto/crypto.factory';

const prisma = new PrismaClient();

// Demo password for every seeded account (local dev only).
const DEMO_PASSWORD = 'Servora@123';

async function main() {
  const passwordHash = await argon2.hash(DEMO_PASSWORD);

  // Same KMS keyfile the API uses → seeded PII is decryptable by the running app.
  const { crypto } = await buildCrypto(
    cryptoOptionsFromEnv(process.env as Record<string, string | undefined>),
  );
  const enc = (v: string) => crypto.encrypt(v);
  const bidx = (v: string) => crypto.blindIndex(v);

  // ── Engineer tiers — commission decreases as tier increases (§6) ──────────
  const tiers: Array<{
    tier: EngineerTier;
    minJobs: number;
    commissionRate: number;
    perks: string[];
    priorityRank: number;
  }> = [
    { tier: 'bronze', minJobs: 0, commissionRate: 0.25, perks: ['Standard support'], priorityRank: 0 },
    { tier: 'silver', minJobs: 25, commissionRate: 0.2, perks: ['Faster payouts'], priorityRank: 1 },
    { tier: 'gold', minJobs: 75, commissionRate: 0.18, perks: ['Priority dispatch'], priorityRank: 2 },
    { tier: 'platinum', minJobs: 150, commissionRate: 0.15, perks: ['Top priority dispatch', 'Lowest commission'], priorityRank: 3 },
  ];
  for (const t of tiers) {
    await prisma.tierDefinition.upsert({
      where: { tier: t.tier },
      update: { minJobs: t.minJobs, commissionRate: t.commissionRate, perks: t.perks, priorityRank: t.priorityRank },
      create: t,
    });
  }

  // ── Catalog: sample services + add-ons ────────────────────────────────────
  const services: Array<{
    slug: string;
    name: string;
    category: ServiceCategory;
    description: string;
    basePrice: number;
    estimatedMinutes: number;
    requiredSkills: string[];
    addons: Array<{ name: string; price: number }>;
  }> = [
    {
      slug: 'network-setup',
      name: 'Office Network Setup',
      category: 'network',
      description: 'Install and configure routers, switches and structured cabling for a business site.',
      basePrice: 4999,
      estimatedMinutes: 120,
      requiredSkills: ['networking', 'cabling'],
      addons: [
        { name: 'Firewall configuration', price: 1500 },
        { name: 'VPN setup', price: 1200 },
      ],
    },
    {
      slug: 'cloud-migration',
      name: 'Cloud Migration Assist',
      category: 'cloud',
      description: 'Migrate on-prem workloads to AWS/Azure with backup and validation.',
      basePrice: 8999,
      estimatedMinutes: 240,
      requiredSkills: ['cloud', 'aws'],
      addons: [{ name: 'Backup configuration', price: 2000 }],
    },
    {
      slug: 'security-audit',
      name: 'Security Audit & Hardening',
      category: 'security',
      description: 'Vulnerability assessment and hardening of endpoints and network.',
      basePrice: 6499,
      estimatedMinutes: 180,
      requiredSkills: ['security', 'networking'],
      addons: [{ name: 'Penetration test', price: 3500 }],
    },
    {
      slug: 'server-admin',
      name: 'Server Administration',
      category: 'sysadmin',
      description: 'Linux/Windows server provisioning, patching and monitoring setup.',
      basePrice: 5499,
      estimatedMinutes: 150,
      requiredSkills: ['sysadmin', 'linux'],
      addons: [{ name: 'Monitoring stack', price: 1800 }],
    },
    {
      slug: 'helpdesk-onsite',
      name: 'On-site Helpdesk Support',
      category: 'helpdesk',
      description: 'On-site troubleshooting for workstations, printers and peripherals.',
      basePrice: 2499,
      estimatedMinutes: 90,
      requiredSkills: ['helpdesk'],
      addons: [],
    },
    {
      slug: 'wifi-optimization',
      name: 'Wi-Fi Coverage Optimization',
      category: 'network',
      description: 'Site survey and access-point placement for full-coverage business Wi-Fi.',
      basePrice: 3999,
      estimatedMinutes: 120,
      requiredSkills: ['networking', 'wifi'],
      addons: [{ name: 'Heatmap report', price: 900 }],
    },
  ];

  for (const s of services) {
    const service = await prisma.service.upsert({
      where: { slug: s.slug },
      update: {
        name: s.name,
        category: s.category,
        description: s.description,
        basePrice: s.basePrice,
        estimatedMinutes: s.estimatedMinutes,
        requiredSkills: s.requiredSkills,
        active: true,
      },
      create: {
        slug: s.slug,
        name: s.name,
        category: s.category,
        description: s.description,
        basePrice: s.basePrice,
        estimatedMinutes: s.estimatedMinutes,
        requiredSkills: s.requiredSkills,
        active: true,
      },
    });
    for (const a of s.addons) {
      const existing = await prisma.addon.findFirst({
        where: { serviceId: service.id, name: a.name },
      });
      if (!existing) {
        await prisma.addon.create({
          data: { serviceId: service.id, name: a.name, price: a.price },
        });
      }
    }
  }

  // ── Admin + super-admin users ──────────────────────────────────────────────
  // PII (email/phone) is encrypted at rest; blind index enables lookup (§A1).
  await prisma.user.upsert({
    where: { emailIndex: bidx('admin@servora.io') },
    update: {},
    create: {
      role: Role.admin,
      email: enc('admin@servora.io'),
      emailIndex: bidx('admin@servora.io'),
      phone: enc('+919000000001'),
      phoneIndex: bidx('+919000000001'),
      passwordHash,
    },
  });

  // Super-admin: the only role allowed Integrations (API keys) + payouts (§A4).
  await prisma.user.upsert({
    where: { emailIndex: bidx('super@servora.io') },
    update: { role: Role.super_admin },
    create: {
      role: Role.super_admin,
      email: enc('super@servora.io'),
      emailIndex: bidx('super@servora.io'),
      phone: enc('+919000000000'),
      phoneIndex: bidx('+919000000000'),
      passwordHash,
    },
  });

  // ── Customers (one GST-verified, one unverified) ──────────────────────────
  const acme = await prisma.user.upsert({
    where: { emailIndex: bidx('ops@acme.example') },
    update: {},
    create: {
      role: Role.customer,
      email: enc('ops@acme.example'),
      emailIndex: bidx('ops@acme.example'),
      phone: enc('+919000000010'),
      phoneIndex: bidx('+919000000010'),
      passwordHash,
      customerProfile: {
        create: {
          companyName: 'Acme Technologies Pvt Ltd',
          gstin: enc('27AAACA1234A1Z5'),
          gstinIndex: bidx('27AAACA1234A1Z5'),
          verifiedLegalName: 'ACME TECHNOLOGIES PRIVATE LIMITED',
          gstStatus: GstStatus.verified,
          gstVerifiedAt: new Date('2026-01-15T00:00:00Z'),
        },
      },
    },
    include: { customerProfile: true },
  });

  // Give Acme a default address (Bengaluru) with PostGIS point.
  if (acme.customerProfile) {
    const hasAddress = await prisma.address.findFirst({
      where: { customerId: acme.customerProfile.id },
    });
    if (!hasAddress) {
      const addr = await prisma.address.create({
        data: {
          customerId: acme.customerProfile.id,
          label: 'HQ',
          line1: enc('12 MG Road'),
          city: 'Bengaluru',
          state: 'Karnataka',
          pincode: enc('560001'),
          lat: 12.9759,
          lng: 77.6063,
          isDefault: true,
        },
      });
      await prisma.$executeRawUnsafe(
        `UPDATE "Address" SET geom = ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography WHERE id = $3`,
        77.6063,
        12.9759,
        addr.id,
      );
    }
  }

  await prisma.user.upsert({
    where: { emailIndex: bidx('it@globex.example') },
    update: {},
    create: {
      role: Role.customer,
      email: enc('it@globex.example'),
      emailIndex: bidx('it@globex.example'),
      phone: enc('+919000000011'),
      phoneIndex: bidx('+919000000011'),
      passwordHash,
      customerProfile: {
        create: {
          companyName: 'Globex Corp',
          gstStatus: GstStatus.unverified,
        },
      },
    },
  });

  // ── Engineers (one approved+online, one pending KYC) ──────────────────────
  const rohit = await prisma.user.upsert({
    where: { emailIndex: bidx('rohit@eng.example') },
    update: {},
    create: {
      role: Role.engineer,
      email: enc('rohit@eng.example'),
      emailIndex: bidx('rohit@eng.example'),
      phone: enc('+919000000020'),
      phoneIndex: bidx('+919000000020'),
      passwordHash,
      engineerProfile: {
        create: {
          fullName: 'Rohit Sharma',
          skills: ['networking', 'cabling', 'wifi'],
          tier: EngineerTier.gold,
          rating: 4.8,
          ratingCount: 124,
          jobsCompleted: 96,
          availability: EngineerAvailability.online,
          approvalStatus: EngineerApprovalStatus.approved,
          approvedAt: new Date('2026-02-01T00:00:00Z'),
          lat: 12.9719,
          lng: 77.6412,
          bankAccountLast4: '4321',
        },
      },
    },
    include: { engineerProfile: true },
  });

  if (rohit.engineerProfile) {
    await prisma.$executeRawUnsafe(
      `UPDATE "EngineerProfile" SET geom = ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, "locationUpdatedAt" = now() WHERE id = $3`,
      77.6412,
      12.9719,
      rohit.engineerProfile.id,
    );
  }

  await prisma.user.upsert({
    where: { emailIndex: bidx('asha@eng.example') },
    update: {},
    create: {
      role: Role.engineer,
      email: enc('asha@eng.example'),
      emailIndex: bidx('asha@eng.example'),
      phone: enc('+919000000021'),
      phoneIndex: bidx('+919000000021'),
      passwordHash,
      engineerProfile: {
        create: {
          fullName: 'Asha Verma',
          skills: ['security', 'sysadmin', 'linux'],
          tier: EngineerTier.bronze,
          availability: EngineerAvailability.offline,
          approvalStatus: EngineerApprovalStatus.pending_kyc,
        },
      },
    },
  });

  console.log('✅ Seed complete.');
  console.log(`   Accounts (password: ${DEMO_PASSWORD}):`);
  console.log('   - super@servora.io        (super_admin — integrations + payouts)');
  console.log('   - admin@servora.io        (admin)');
  console.log('   - ops@acme.example        (customer, GST-verified)');
  console.log('   - it@globex.example       (customer)');
  console.log('   - rohit@eng.example       (engineer, approved + online)');
  console.log('   - asha@eng.example        (engineer, pending KYC)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
