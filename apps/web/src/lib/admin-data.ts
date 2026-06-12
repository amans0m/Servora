// Mock datasets for the admin panel (swap to real endpoints via the BFF later).

export interface Job {
  id: string;
  service: string;
  customer: string;
  engineer: string | null;
  status: 'quote' | 'confirmed' | 'active' | 'awaiting_payment' | 'completed';
  amount: number;
}

export const mockJobs: Job[] = [
  { id: 'JOB-1042', service: 'Office Network Setup', customer: 'Acme Technologies', engineer: 'Rohit Sharma', status: 'active', amount: 4719 },
  { id: 'JOB-1041', service: 'Security Audit', customer: 'Globex Corp', engineer: 'Asha Verma', status: 'awaiting_payment', amount: 7668 },
  { id: 'JOB-1040', service: 'Cloud Migration', customer: 'Initech', engineer: 'Vikram Rao', status: 'completed', amount: 10619 },
  { id: 'JOB-1039', service: 'Helpdesk Support', customer: 'Umbrella Inc', engineer: null, status: 'quote', amount: 0 },
  { id: 'JOB-1038', service: 'Wi-Fi Optimization', customer: 'Stark Industries', engineer: 'Rohit Sharma', status: 'completed', amount: 4719 },
  { id: 'JOB-1037', service: 'Server Administration', customer: 'Wayne Enterprises', engineer: null, status: 'confirmed', amount: 6489 },
];

export interface AdminService {
  id: string;
  name: string;
  category: string;
  price: number;
  durationMin: number;
  live: boolean;
}

export const mockAdminServices: AdminService[] = [
  { id: 's1', name: 'Office Network Setup', category: 'Network', price: 4999, durationMin: 120, live: true },
  { id: 's2', name: 'Cloud Migration Assist', category: 'Cloud', price: 8999, durationMin: 240, live: true },
  { id: 's3', name: 'Security Audit & Hardening', category: 'Security', price: 6499, durationMin: 180, live: true },
  { id: 's4', name: 'On-site Helpdesk Support', category: 'Helpdesk', price: 2499, durationMin: 90, live: false },
  { id: 's5', name: 'Wi-Fi Coverage Optimization', category: 'Network', price: 3999, durationMin: 120, live: true },
];

export interface PendingEngineer {
  id: string;
  name: string;
  skills: string[];
  kyc: { aadhaar: boolean; pan: boolean; bank: boolean };
  appliedAt: string;
}
export interface ActiveEngineer {
  id: string;
  name: string;
  skills: string[];
  rating: number;
  jobs: number;
  tier: string;
  status: 'online' | 'offline';
}

export const mockPendingEngineers: PendingEngineer[] = [
  { id: 'e10', name: 'Asha Verma', skills: ['security', 'sysadmin'], kyc: { aadhaar: true, pan: true, bank: true }, appliedAt: '2 days ago' },
  { id: 'e11', name: 'Sunil Patel', skills: ['networking'], kyc: { aadhaar: true, pan: true, bank: false }, appliedAt: '5 hours ago' },
];
export const mockActiveEngineers: ActiveEngineer[] = [
  { id: 'e1', name: 'Rohit Sharma', skills: ['networking', 'wifi'], rating: 4.8, jobs: 96, tier: 'Gold', status: 'online' },
  { id: 'e2', name: 'Vikram Rao', skills: ['cloud', 'networking'], rating: 4.9, jobs: 140, tier: 'Platinum', status: 'online' },
  { id: 'e3', name: 'Neha Gupta', skills: ['helpdesk'], rating: 4.5, jobs: 38, tier: 'Silver', status: 'offline' },
];

export interface DispatchJob {
  id: string;
  service: string;
  customer: string;
  address: string;
  requiredSkills: string[];
}
export interface Candidate {
  id: string;
  name: string;
  rating: number;
  distanceKm: number;
  currentLoad: number;
  skills: string[];
  score: number; // lower = better (distance + load − rating − tier)
}

export const mockUnassigned: DispatchJob[] = [
  { id: 'JOB-1043', service: 'Office Network Setup', customer: 'Hooli', address: '4 Residency Rd, Bengaluru', requiredSkills: ['networking'] },
  { id: 'JOB-1044', service: 'Security Audit', customer: 'Pied Piper', address: '9 Indiranagar, Bengaluru', requiredSkills: ['security'] },
];
export const mockCandidates: Record<string, Candidate[]> = {
  'JOB-1043': [
    { id: 'e1', name: 'Rohit Sharma', rating: 4.8, distanceKm: 2.3, currentLoad: 0, skills: ['networking', 'wifi'], score: 0.83 },
    { id: 'e2', name: 'Vikram Rao', rating: 4.9, distanceKm: 4.1, currentLoad: 1, skills: ['cloud', 'networking'], score: 2.76 },
  ],
  'JOB-1044': [
    { id: 'e3', name: 'Asha Verma', rating: 4.6, distanceKm: 3.8, currentLoad: 0, skills: ['security', 'sysadmin'], score: 1.1 },
  ],
};
