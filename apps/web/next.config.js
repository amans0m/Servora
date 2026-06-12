/** @type {import('next').NextConfig} */

// Defense-in-depth security headers (SECURITY.md B4/B5). A nonce-based CSP is a
// later refinement; this header-based policy is applied to every route.
//
// NOTE: `next dev` uses eval() for React Fast Refresh / HMR, which a strict CSP
// blocks (no client hydration → buttons dead). We allow 'unsafe-eval' ONLY in
// development; the production policy below never permits eval.
const isDev = process.env.NODE_ENV !== 'production';
const scriptSrc = isDev
  ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
  : "script-src 'self' 'unsafe-inline'";

const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "img-src 'self' data: https:",
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  scriptSrc,
  // Dev HMR uses a websocket back to the Next dev server.
  isDev ? "connect-src 'self' ws: wss:" : "connect-src 'self'",
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'no-referrer' },
  { key: 'Strict-Transport-Security', value: 'max-age=15552000; includeSubDomains; preload' },
];

const nextConfig = {
  reactStrictMode: true,
  // No public source maps; strip console (keep error/warn) in production (B5).
  productionBrowserSourceMaps: false,
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error', 'warn'] } : false,
  },
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }];
  },
};

module.exports = nextConfig;
