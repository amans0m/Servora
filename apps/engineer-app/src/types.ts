export type JobStatus =
  | 'idle'
  | 'offer'
  | 'navigating'
  | 'arrived'
  | 'in_progress'
  | 'awaiting_otp'
  | 'done';

export interface Job {
  id: string;
  customerName: string;
  customerRating: number;
  customerJobs: number;
  serviceName: string;
  payout: number;
  peakBonus: number;
  address: string;
  distanceKm: number;
  etaMin: number;
  tasks: string[];
  proof: string[];
}

export interface Payout {
  id: string;
  job: string;
  amount: number;
  when: string;
}

export interface Tier {
  name: string;
  commission: number; // %
  perks: string;
}

export const TIERS: Tier[] = [
  { name: 'Bronze', commission: 25, perks: 'Standard support' },
  { name: 'Silver', commission: 20, perks: 'Faster payouts' },
  { name: 'Gold', commission: 18, perks: 'Priority dispatch' },
  { name: 'Platinum', commission: 15, perks: 'Top priority · lowest commission' },
];
