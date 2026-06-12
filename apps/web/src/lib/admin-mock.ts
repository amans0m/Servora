export interface DashboardData {
  kpis: {
    revenue: number;
    commission: number;
    activeJobs: number;
    engineersOnline: number;
    pendingPayouts: { count: number; amount: number };
  };
  recentJobs: {
    id: string;
    service: string;
    customer: string;
    engineer: string | null;
    status: string;
    amount: number;
  }[];
  revenue7d: { date: string; revenue: number }[];
}

export const mockDashboard: DashboardData = {
  kpis: {
    revenue: 1061788,
    commission: 191122,
    activeJobs: 7,
    engineersOnline: 5,
    pendingPayouts: { count: 3, amount: 11240 },
  },
  recentJobs: [
    { id: 'JOB-1042', service: 'Office Network Setup', customer: 'Acme Technologies', engineer: 'Rohit Sharma', status: 'in_progress', amount: 4719 },
    { id: 'JOB-1041', service: 'Security Audit', customer: 'Globex Corp', engineer: 'Asha Verma', status: 'awaiting_payment', amount: 7668 },
    { id: 'JOB-1040', service: 'Cloud Migration', customer: 'Initech', engineer: 'Vikram Rao', status: 'completed', amount: 10619 },
    { id: 'JOB-1039', service: 'Helpdesk Support', customer: 'Umbrella Inc', engineer: null, status: 'quote', amount: 0 },
    { id: 'JOB-1038', service: 'Wi-Fi Optimization', customer: 'Stark Industries', engineer: 'Rohit Sharma', status: 'completed', amount: 4719 },
  ],
  revenue7d: [
    { date: 'Mon', revenue: 82000 },
    { date: 'Tue', revenue: 96500 },
    { date: 'Wed', revenue: 71000 },
    { date: 'Thu', revenue: 120400 },
    { date: 'Fri', revenue: 138900 },
    { date: 'Sat', revenue: 64200 },
    { date: 'Sun', revenue: 49800 },
  ],
};
