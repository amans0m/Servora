import type { Category, Coupon, Engineer, Service } from '../../types';

export const categories: Category[] = [
  { id: 'network', name: 'Network', icon: '🌐' },
  { id: 'cloud', name: 'Cloud', icon: '☁️' },
  { id: 'security', name: 'Security', icon: '🛡️' },
  { id: 'sysadmin', name: 'Server', icon: '🖥️' },
  { id: 'helpdesk', name: 'Helpdesk', icon: '🎧' },
  { id: 'wifi', name: 'Wi-Fi', icon: '📶' },
  { id: 'backup', name: 'Backup', icon: '💾' },
  { id: 'custom', name: 'Custom', icon: '✨', custom: true },
];

const reviews = (svc: string) => [
  { id: `${svc}-r1`, author: 'Rahul M.', stars: 5, text: 'On time and very professional.' },
  { id: `${svc}-r2`, author: 'Priya S.', stars: 4, text: 'Clean work, explained everything.' },
  { id: `${svc}-r3`, author: 'Imran K.', stars: 5, text: 'Fixed our office network fast.' },
];

export const services: Service[] = [
  {
    id: 'svc-network',
    slug: 'office-network-setup',
    name: 'Office Network Setup',
    category: 'network',
    price: 4999,
    rating: 4.8,
    engineersNearby: 6,
    summary: 'Install & configure routers, switches and structured cabling for a business site.',
    included: ['Router & switch config', 'Structured cabling', 'Speed & coverage test', 'Handover docs'],
    addons: [
      { id: 'fw', name: 'Firewall configuration', price: 1500 },
      { id: 'vpn', name: 'VPN setup', price: 1200 },
    ],
    reviews: reviews('network'),
  },
  {
    id: 'svc-cloud',
    slug: 'cloud-migration',
    name: 'Cloud Migration Assist',
    category: 'cloud',
    price: 8999,
    rating: 4.7,
    engineersNearby: 4,
    summary: 'Migrate on-prem workloads to AWS/Azure with backup and validation.',
    included: ['Migration plan', 'Workload move', 'Backup config', 'Validation'],
    addons: [{ id: 'bkp', name: 'Backup configuration', price: 2000 }],
    reviews: reviews('cloud'),
  },
  {
    id: 'svc-security',
    slug: 'security-audit',
    name: 'Security Audit & Hardening',
    category: 'security',
    price: 6499,
    rating: 4.9,
    engineersNearby: 3,
    summary: 'Vulnerability assessment and hardening of endpoints and network.',
    included: ['Vulnerability scan', 'Endpoint hardening', 'Report'],
    addons: [{ id: 'pen', name: 'Penetration test', price: 3500 }],
    reviews: reviews('security'),
  },
  {
    id: 'svc-helpdesk',
    slug: 'helpdesk-onsite',
    name: 'On-site Helpdesk Support',
    category: 'helpdesk',
    price: 2499,
    rating: 4.6,
    engineersNearby: 8,
    summary: 'On-site troubleshooting for workstations, printers and peripherals.',
    included: ['Workstation fixes', 'Printer setup', 'Peripheral support'],
    addons: [],
    reviews: reviews('helpdesk'),
  },
  {
    id: 'svc-wifi',
    slug: 'wifi-optimization',
    name: 'Wi-Fi Coverage Optimization',
    category: 'wifi',
    price: 3999,
    rating: 4.7,
    engineersNearby: 5,
    summary: 'Site survey and access-point placement for full-coverage business Wi-Fi.',
    included: ['Site survey', 'AP placement', 'Heatmap'],
    addons: [{ id: 'hm', name: 'Heatmap report', price: 900 }],
    reviews: reviews('wifi'),
  },
  {
    id: 'svc-server',
    slug: 'server-admin',
    name: 'Server Administration',
    category: 'sysadmin',
    price: 5499,
    rating: 4.8,
    engineersNearby: 4,
    summary: 'Linux/Windows server provisioning, patching and monitoring setup.',
    included: ['Provisioning', 'Patching', 'Monitoring'],
    addons: [{ id: 'mon', name: 'Monitoring stack', price: 1800 }],
    reviews: reviews('server'),
  },
];

export const coupons: Coupon[] = [
  { code: 'SAVE20', label: '20% off your booking', type: 'percent', value: 20 },
  { code: 'FLAT500', label: '₹500 off orders over ₹3,000', type: 'flat', value: 500 },
];

export const mockEngineers: Engineer[] = [
  { id: 'eng-rohit', name: 'Rohit Sharma', rating: 4.8, jobs: 96, distanceKm: 2.3, skills: ['networking', 'wifi'], etaMin: 12 },
  { id: 'eng-asha', name: 'Asha Verma', rating: 4.6, jobs: 54, distanceKm: 3.8, skills: ['security', 'sysadmin'], etaMin: 18 },
  { id: 'eng-vikram', name: 'Vikram Rao', rating: 4.9, jobs: 140, distanceKm: 4.1, skills: ['cloud', 'networking'], etaMin: 20 },
];
