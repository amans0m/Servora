export interface IntegrationField {
  field: string;
  label: string;
  set: boolean; // whether a value is stored (the value itself is NEVER returned)
}
export interface Integration {
  provider: string;
  name: string;
  purpose: string;
  status: 'connected' | 'not_set' | 'error';
  enabled: boolean;
  fields: IntegrationField[];
}

const f = (field: string, label: string, set = false): IntegrationField => ({ field, label, set });

export const mockIntegrations: Integration[] = [
  { provider: 'surepass', name: 'Surepass', purpose: 'GST + identity KYC', status: 'connected', enabled: true, fields: [f('token', 'API token', true), f('baseUrl', 'Base URL', true)] },
  { provider: 'razorpay', name: 'Razorpay', purpose: 'Customer payments', status: 'not_set', enabled: false, fields: [f('keyId', 'Key ID'), f('keySecret', 'Key secret')] },
  { provider: 'razorpayx', name: 'RazorpayX', purpose: 'Engineer payouts', status: 'not_set', enabled: false, fields: [f('key', 'Key'), f('secret', 'Secret')] },
  { provider: 'google_maps', name: 'Google Maps', purpose: 'Geo, routing, maps', status: 'not_set', enabled: false, fields: [f('apiKey', 'API key')] },
  { provider: 'fcm', name: 'Firebase (FCM)', purpose: 'Push notifications', status: 'not_set', enabled: false, fields: [f('serviceAccount', 'Service account JSON')] },
  { provider: 'msg91', name: 'MSG91', purpose: 'SMS & OTP', status: 'not_set', enabled: false, fields: [f('authKey', 'Auth key')] },
  { provider: 's3', name: 'AWS S3', purpose: 'File storage', status: 'not_set', enabled: false, fields: [f('accessKeyId', 'Access key id'), f('secret', 'Secret'), f('bucket', 'Bucket')] },
  { provider: 'email', name: 'Email (SES)', purpose: 'Invoices & receipts', status: 'not_set', enabled: false, fields: [f('sesRegion', 'SES region'), f('sendgridApiKey', 'SendGrid key')] },
  { provider: 'sentry', name: 'Sentry', purpose: 'Error monitoring', status: 'not_set', enabled: false, fields: [f('dsn', 'DSN')] },
];
