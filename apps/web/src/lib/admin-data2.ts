// Mock datasets for admin batch 2 (customers, payments, coupons, incentives, disputes).

export interface Customer {
  id: string;
  company: string;
  type: string;
  jobs: number;
  ltv: number;
  engineerRating: number | null; // how engineers rate this customer (admin-only)
  status: 'active' | 'suspended';
}
export const mockCustomers: Customer[] = [
  { id: 'c1', company: 'Acme Technologies', type: 'SMB', jobs: 14, ltv: 106177, engineerRating: 4.8, status: 'active' },
  { id: 'c2', company: 'Globex Corp', type: 'Enterprise', jobs: 31, ltv: 284900, engineerRating: 4.2, status: 'active' },
  { id: 'c3', company: 'Initech', type: 'SMB', jobs: 6, ltv: 41200, engineerRating: null, status: 'active' },
  { id: 'c4', company: 'Umbrella Inc', type: 'Enterprise', jobs: 22, ltv: 198400, engineerRating: 3.6, status: 'suspended' },
];

export interface Transaction {
  jobId: string;
  customer: string;
  service: string;
  customerPaid: number | null;
  payout: number | null;
  commission: number | null;
  state: 'captured' | 'charges_on_completion';
}
export const mockPayments = {
  kpis: { toCollect: 18650, commission: 191122, pendingPayouts: 11240 },
  transactions: [
    { jobId: 'JOB-1040', customer: 'Initech', service: 'Cloud Migration', customerPaid: 10619, payout: 8707, commission: 1912, state: 'captured' as const },
    { jobId: 'JOB-1038', customer: 'Stark Industries', service: 'Wi-Fi Optimization', customerPaid: 4719, payout: 3870, commission: 849, state: 'captured' as const },
    { jobId: 'JOB-1042', customer: 'Acme Technologies', service: 'Office Network Setup', customerPaid: null, payout: null, commission: null, state: 'charges_on_completion' as const },
    { jobId: 'JOB-1041', customer: 'Globex Corp', service: 'Security Audit', customerPaid: null, payout: null, commission: null, state: 'charges_on_completion' as const },
  ] as Transaction[],
};

export interface Coupon {
  id: string;
  code: string;
  discountType: 'percent' | 'flat';
  value: number;
  scope: string;
  used: number;
  maxUses: number | null;
  expiry: string;
  live: boolean;
}
export const mockCoupons: Coupon[] = [
  { id: 'cp1', code: 'SAVE20', discountType: 'percent', value: 20, scope: 'all', used: 142, maxUses: 500, expiry: '2026-12-31', live: true },
  { id: 'cp2', code: 'FLAT500', discountType: 'flat', value: 500, scope: 'all', used: 88, maxUses: null, expiry: '2026-09-30', live: true },
  { id: 'cp3', code: 'CLOUD15', discountType: 'percent', value: 15, scope: 'cloud', used: 12, maxUses: 100, expiry: '2026-08-15', live: false },
];

export interface IncentiveProgram {
  id: string;
  name: string;
  type: 'milestone' | 'quest' | 'surge' | 'quality' | 'referral';
  reward: string;
  live: boolean;
}
export interface Tier {
  name: string;
  requirement: string;
  commission: number;
  perks: string;
}
export const mockIncentives = {
  kpis: { bonusesPaid: 84200, jobsLift: '+18%', activeQuests: 3 },
  programs: [
    { id: 'i1', name: 'Weekly 12-job quest', type: 'quest' as const, reward: '₹800', live: true },
    { id: 'i2', name: 'Weekend surge', type: 'surge' as const, reward: '+10% payout', live: true },
    { id: 'i3', name: '5-star streak', type: 'quality' as const, reward: '₹500', live: true },
    { id: 'i4', name: 'Refer an engineer', type: 'referral' as const, reward: '₹1,000', live: false },
  ] as IncentiveProgram[],
  tiers: [
    { name: 'Bronze', requirement: '0+ jobs', commission: 25, perks: 'Standard support' },
    { name: 'Silver', requirement: '25+ jobs', commission: 20, perks: 'Faster payouts' },
    { name: 'Gold', requirement: '75+ jobs', commission: 18, perks: 'Priority dispatch' },
    { name: 'Platinum', requirement: '150+ jobs', commission: 15, perks: 'Top priority · lowest commission' },
  ] as Tier[],
  recentBonuses: [
    { engineer: 'Rohit Sharma', program: 'Weekly quest', amount: 800, when: 'Today' },
    { engineer: 'Vikram Rao', program: 'Weekend surge', amount: 420, when: 'Yesterday' },
  ],
};

export interface Dispute {
  id: string;
  bookingId: string;
  category: string;
  severity: 'low' | 'medium' | 'high';
  status: 'open' | 'resolved' | 'rejected';
  context: string;
}
export const mockDisputes: Dispute[] = [
  { id: 'd1', bookingId: 'JOB-1041', category: 'Disputed proof', severity: 'high', status: 'open', context: 'Customer says cabling not completed as shown.' },
  { id: 'd2', bookingId: 'JOB-1035', category: 'Late arrival', severity: 'medium', status: 'open', context: 'Engineer arrived 90 min late.' },
  { id: 'd3', bookingId: 'JOB-1029', category: 'Billing query', severity: 'low', status: 'resolved', context: 'Add-on charged twice — refunded.' },
];
