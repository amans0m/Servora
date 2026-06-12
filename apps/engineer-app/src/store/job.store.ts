import { create } from 'zustand';

import type { Job, JobStatus, Payout } from '../types';

const SAMPLE_OFFERS: Omit<Job, 'id' | 'proof'>[] = [
  {
    customerName: 'Acme Technologies',
    customerRating: 4.7,
    customerJobs: 12,
    serviceName: 'Office Network Setup',
    payout: 3869,
    peakBonus: 150,
    address: '12 MG Road, Bengaluru',
    distanceKm: 2.3,
    etaMin: 12,
    tasks: ['Router & switch config', 'Structured cabling', 'Speed & coverage test'],
  },
  {
    customerName: 'Globex Corp',
    customerRating: 4.4,
    customerJobs: 5,
    serviceName: 'Wi-Fi Coverage Optimization',
    payout: 3100,
    peakBonus: 0,
    address: '88 Residency Rd, Bengaluru',
    distanceKm: 3.9,
    etaMin: 18,
    tasks: ['Site survey', 'AP placement', 'Heatmap'],
  },
];

interface JobState {
  online: boolean;
  status: JobStatus;
  job: Job | null;
  earningsToday: number;
  earningsWeek: number;
  jobsToday: number;
  withdrawable: number;
  payouts: Payout[];
  setOnline: (v: boolean) => void;
  simulateOffer: () => void;
  receiveOffer: (payload: Partial<Job> & { serviceName: string; payout: number }) => void;
  accept: () => void;
  decline: () => void;
  arrive: () => void;
  startJob: () => void;
  addProof: () => void;
  completeWork: () => void;
  closeJob: () => void;
  finish: () => void;
}

function id() {
  return `job_${Date.now()}`;
}

export const useJobStore = create<JobState>((set, get) => ({
  online: false,
  status: 'idle',
  job: null,
  earningsToday: 2480,
  earningsWeek: 18650,
  jobsToday: 3,
  withdrawable: 6240,
  payouts: [
    { id: 'p1', job: 'Security Audit', amount: 5328, when: 'Yesterday' },
    { id: 'p2', job: 'Helpdesk Support', amount: 2049, when: '2 days ago' },
  ],

  setOnline: (v) => set({ online: v }),

  simulateOffer: () => {
    if (!get().online) return;
    const pick = SAMPLE_OFFERS[Math.floor(Math.random() * SAMPLE_OFFERS.length)];
    set({ status: 'offer', job: { ...pick, id: id(), proof: [] } });
  },

  // Real offer pushed over the dispatch socket (§7).
  receiveOffer: (payload) =>
    set({
      status: 'offer',
      job: {
        id: payload.id ?? id(),
        customerName: payload.customerName ?? 'Customer',
        customerRating: payload.customerRating ?? 0,
        customerJobs: payload.customerJobs ?? 0,
        serviceName: payload.serviceName,
        payout: payload.payout,
        peakBonus: payload.peakBonus ?? 0,
        address: payload.address ?? '',
        distanceKm: payload.distanceKm ?? 0,
        etaMin: payload.etaMin ?? 0,
        tasks: payload.tasks ?? [],
        proof: [],
      },
    }),

  accept: () => set({ status: 'navigating' }),
  decline: () => set({ status: 'idle', job: null }),
  arrive: () => set({ status: 'arrived' }),
  startJob: () => set({ status: 'in_progress' }),

  addProof: () =>
    set((s) => (s.job ? { job: { ...s.job, proof: [...s.job.proof, `proof-${s.job.proof.length + 1}.jpg`] } } : {})),

  completeWork: () => set({ status: 'awaiting_otp' }),

  // Verify & finish: completion OTP entered → payout released (minus commission).
  closeJob: () =>
    set((s) => {
      if (!s.job) return {};
      const payout: Payout = { id: `p_${Date.now()}`, job: s.job.serviceName, amount: s.job.payout, when: 'Just now' };
      return {
        status: 'done',
        payouts: [payout, ...s.payouts],
        earningsToday: s.earningsToday + s.job.payout,
        earningsWeek: s.earningsWeek + s.job.payout,
        jobsToday: s.jobsToday + 1,
        withdrawable: s.withdrawable + s.job.payout,
      };
    }),

  finish: () => set({ status: 'idle', job: null }),
}));
