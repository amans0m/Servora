export interface Addon {
  id: string;
  name: string;
  price: number;
}
export interface Service {
  id: string;
  slug: string;
  name: string;
  category: string;
  price: number;
  rating: number;
  engineersNearby: number;
  summary: string;
  included: string[];
  addons: Addon[];
}

export const mockServices: Service[] = [
  {
    id: 'svc-network',
    slug: 'office-network-setup',
    name: 'Office Network Setup',
    category: 'Network',
    price: 4999,
    rating: 4.8,
    engineersNearby: 6,
    summary: 'Install & configure routers, switches and structured cabling for a business site.',
    included: ['Router & switch config', 'Structured cabling', 'Speed & coverage test', 'Handover docs'],
    addons: [
      { id: 'fw', name: 'Firewall configuration', price: 1500 },
      { id: 'vpn', name: 'VPN setup', price: 1200 },
    ],
  },
  {
    id: 'svc-cloud',
    slug: 'cloud-migration',
    name: 'Cloud Migration Assist',
    category: 'Cloud',
    price: 8999,
    rating: 4.7,
    engineersNearby: 4,
    summary: 'Migrate on-prem workloads to AWS/Azure with backup and validation.',
    included: ['Migration plan', 'Workload move', 'Backup config', 'Validation'],
    addons: [{ id: 'bkp', name: 'Backup configuration', price: 2000 }],
  },
  {
    id: 'svc-security',
    slug: 'security-audit',
    name: 'Security Audit & Hardening',
    category: 'Security',
    price: 6499,
    rating: 4.9,
    engineersNearby: 3,
    summary: 'Vulnerability assessment and hardening of endpoints and network.',
    included: ['Vulnerability scan', 'Endpoint hardening', 'Report'],
    addons: [{ id: 'pen', name: 'Penetration test', price: 3500 }],
  },
  {
    id: 'svc-server',
    slug: 'server-admin',
    name: 'Server Administration',
    category: 'Sysadmin',
    price: 5499,
    rating: 4.8,
    engineersNearby: 4,
    summary: 'Linux/Windows server provisioning, patching and monitoring setup.',
    included: ['Provisioning', 'Patching', 'Monitoring'],
    addons: [{ id: 'mon', name: 'Monitoring stack', price: 1800 }],
  },
  {
    id: 'svc-helpdesk',
    slug: 'helpdesk-onsite',
    name: 'On-site Helpdesk Support',
    category: 'Helpdesk',
    price: 2499,
    rating: 4.6,
    engineersNearby: 8,
    summary: 'On-site troubleshooting for workstations, printers and peripherals.',
    included: ['Workstation fixes', 'Printer setup', 'Peripheral support'],
    addons: [],
  },
  {
    id: 'svc-wifi',
    slug: 'wifi-optimization',
    name: 'Wi-Fi Coverage Optimization',
    category: 'Network',
    price: 3999,
    rating: 4.7,
    engineersNearby: 5,
    summary: 'Site survey and access-point placement for full-coverage business Wi-Fi.',
    included: ['Site survey', 'AP placement', 'Heatmap'],
    addons: [{ id: 'hm', name: 'Heatmap report', price: 900 }],
  },
];
