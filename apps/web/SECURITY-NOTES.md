# Web frontend security (SECURITY.md Part B)

How Part B is implemented in `apps/web` (Next.js App Router + a thin BFF).

| § | Control | Implementation |
|---|---|---|
| B1 | No secrets in bundle | Server-only `lib/config.ts` (no `NEXT_PUBLIC_`); only a non-secret mock flag is client-readable. All third-party calls go through the API via the BFF. |
| B1 | Token storage | Tokens live in **httpOnly + Secure + SameSite=strict cookies** set by the BFF (`/api/auth/*`) — never `localStorage`/`sessionStorage`, never in client JS. Cleared on logout + on refresh failure. |
| B2 | Transport | API base is server-side (`https://` in prod); BFF forwards over TLS. Sockets use `wss://`. |
| B3 | Token lifecycle | **Silent one-shot refresh** with the rotating refresh token inside the BFF proxy (`/api/bff/[...path]`) — rotates cookies, clean logout on failure. The **A3 timestamp+nonce+HMAC signature is computed server-side** in the BFF (the token/HMAC key never reaches the browser). **Admin inactivity auto-logout** after 15 min (`AdminShell`). |
| B4 | CSP / output / params | CSP + `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`, HSTS via `next.config.js` headers; no `dangerouslySetInnerHTML`; URL params validated (e.g. service `[slug]` regex + `notFound()`). |
| B5 | No leaks | `compiler.removeConsole` (prod, keeps error/warn), `productionBrowserSourceMaps: false`, minified production build, minimal data in views. |
| B6 | Payments | Marketing only deep-links to the apps; no card data on web. |
| B7 | Dependencies | Exact-pinned; `pnpm audit` in CI. |
| §A4 | Authorization | Admin is auth-gated server-side (cookie check → redirect). **Integrations is super-admin only** — gated both in the sidebar and by a server-side role check on the page (redirects a normal admin). |
| §A8 | Integration keys | Always shown **masked**; inputs are write-only and never pre-filled with stored values; the full value is never returned after save (enforced by the backend admin endpoint). |

## Dependency advisories — accepted / tracked (CI `pnpm audit --prod`)
These are listed in the root `pnpm.auditConfig.ignoreGhsas` with rationale:
- **Next.js (GHSA-h25m…, q4gf…, 8h8q…, c4j6…, 36qx…):** pinned to the latest
  **14.2.x LTS (14.2.35)**; these advisories are only patched in **Next 15**
  (a React-19 major upgrade). **Tracked: migrate to Next 15** in a dedicated PR
  (async `cookies()/headers()` + React 19). No patch exists in the 14.x line.
- **tar (GHSA-8qq5…, 83g3…, qffp…, 9ppj…, r6q2…, 34x7…):** transitive via
  **`@expo/cli` (build tooling)** — not present in any deployed runtime bundle.
- **lodash (GHSA-r5fr-rjxr-66jc):** no upstream fix (4.17.21 is latest).

## Refinement (documented)
- **Nonce-based CSP:** the current policy uses `'unsafe-inline'` for scripts/styles (App Router needs it without nonce propagation). A stricter nonce-based CSP via middleware is the next hardening step.
- **Mock → real:** `NEXT_PUBLIC_USE_MOCKS=false` + `SERVORA_API_URL` point the data layer + BFF at the NestJS backend.
