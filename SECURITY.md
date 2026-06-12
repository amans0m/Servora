# Servora — Security Requirements (Backend + Frontend)

**Status:** Mandatory. Every control in this document MUST be implemented.
**Audience:** The engineer/AI agent building Servora (API, web, and mobile apps).
**How to use:** Save this file in the project root. When generating code, follow this document fully,
in addition to `Servora-Tech-Stack.docx`, `Servora-Component-Brief.docx` and `servora-prototype.html`.
Treat every endpoint and client as hostile-facing. When unsure, choose the more secure option and note
the trade-off.

---

## 0. Principles

- **Defense in depth** — never rely on a single control.
- **Least privilege** — users, roles and services get the minimum access they need.
- **Zero trust of the client** — all real validation and authorization happen on the server.
- **Fail closed** — on any doubt, deny access rather than allow it.
- **Minimum data** — collect, return, store and log the least data necessary.
- **No secrets in code or git** — ever.

---

# PART A — BACKEND SECURITY

## A1. Encryption (in transit + at rest)

- Enforce **HTTPS/TLS** on every connection. Enable **HSTS**. Redirect HTTP → HTTPS. Use **wss://** for
  WebSockets.
- **At rest:** enable database encryption **and** add **application-level field encryption (AES-256-GCM)**
  for all PII (Aadhaar / PAN / GST, phone, email, address, bank details) and for **all third-party API
  keys** stored in the DB.
- The **master encryption key** comes from a secrets manager / KMS (AWS KMS, etc.) — never hardcoded,
  never in `.env` committed to git.
- Support **key versioning and rotation** (store a key id with each encrypted record so old data can be
  re-encrypted on rotation).
- **Backups** are encrypted and access-controlled.

## A2. Authentication & token rotation

- **Access tokens (JWT):** short-lived, **10–15 minutes**. Signed with a strong secret/asymmetric key.
- **Refresh tokens:** **one-time use** and **rotated on every refresh**. Each refresh issues a new
  refresh token and invalidates the previous one.
- **Refresh-token reuse detection:** if an already-used refresh token is presented, treat it as theft —
  **revoke the entire session family** and force re-login.
- Store refresh tokens **hashed** server-side (never plaintext). Each token has a **`jti`**; maintain a
  **revocation denylist**. Support **logout** and **logout-all-devices**.
- **Bind sessions to device** (device id / fingerprint) where possible.
- **Passwords:** hashed with **argon2id** (or bcrypt with strong cost). Never stored or logged in plain.
- **OTPs** (login, start, completion): single-use, short expiry, **rate-limited**, **hashed at rest**,
  and invalidated after use.

## A3. Anti-replay & idempotency

- Every **mutating request** carries a **timestamp + nonce** and an **HMAC signature** computed over
  `method + path + body + timestamp + nonce`. The server **rejects stale timestamps and reused nonces**.
  This makes each request effectively unique and blocks replay attacks.
- All **payment and other critical mutating endpoints** accept an **idempotency key** so retries cannot
  double-charge or double-process.

## A4. Authorization

- **Role-based access** (customer / engineer / admin) on every route via guards.
- **Per-resource ownership checks** in the **service layer** (not only the route): a user can only ever
  read or modify **their own** data. A customer cannot read another customer's bookings; an engineer
  cannot access jobs not assigned to them; etc.
- A separate **super-admin** role is required for the **Integrations (API keys)** screen and for
  **payouts** — normal admin staff cannot access these.

## A5. Input / output safety (OWASP Top 10)

- **Validate and sanitize all input** with DTOs (Zod / class-validator). Use strict types and **reject
  unknown fields**.
- **Database:** Prisma **parameterized queries only** — never build SQL by string concatenation.
- Protect against **XSS, SSRF, path traversal, command injection, and mass-assignment**.
- **File uploads:** validate type and size; store in **private S3** (no public ACL); serve via
  **signed, expiring URLs** only.
- **CORS:** strict allowlist of known origins (no `*`).
- **Security headers** via helmet: CSP, `X-Content-Type-Options: nosniff`, frame-deny, referrer-policy;
  disable `x-powered-by`.
- **CSRF protection** for any cookie-based flow.
- **Rate limiting** globally, with stricter limits + **lockout/backoff** on auth and OTP endpoints.

## A6. No data leaks / logging hygiene

- **Never log** request or response bodies, tokens, passwords, OTPs, payment data, or
  Aadhaar / PAN / GST / API keys. Use a logger with **automatic redaction** of sensitive fields.
- **Never** send stack traces or internal details to the client. Return a **generic error message + a
  correlation id**; full detail goes to server logs only.
- **Disable** verbose/debug logging in production. **Remove all `console.log`.** Do not expose source maps.
- **Response DTOs return only the minimum fields** the client needs — never expose internal ids, raw DB
  columns, or other users' data. No overfetching.
- **Uniform auth errors:** the response for "wrong email" and "wrong password" must be identical, to
  prevent **user enumeration**. Same for "user exists" checks.

## A7. Payments & PII

- **Card data never touches our servers** — Razorpay (PCI-compliant) handles it. Store only **masked
  references** (last 4, token).
- **Verify Razorpay webhook signatures** before acting on any webhook.
- **KYC / GST (Surepass):** store only **verification status + masked references + timestamp**, not raw
  documents in plaintext. All Surepass/Razorpay calls happen **server-side only**.
- **Restrict and audit-log** every access to PII.

## A8. Secrets & integration keys

- **No secrets in code or git.** Use `.env` locally (git-ignored) and a **secrets manager** in production.
- **Integration API keys** (Surepass, Razorpay, RazorpayX, Google Maps, FCM, MSG91, SES, S3, Sentry) are
  stored **encrypted in the database** (per the Tech-Stack doc), decrypted **only in memory at point of
  use**, and read through a single **integrations config service** — never `process.env` directly for
  third-party keys. The API reads the DB key first and falls back to env if unset.
- API keys are **masked** in every admin UI response; the full value is never returned after saving.

## A9. Audit & monitoring

- **Audit log** (who / what / when / from where) for: admin actions, payouts, integration-key changes,
  KYC approvals/rejections, refunds, and any PII access.
- **Error monitoring** (Sentry) with **PII scrubbing**. **Alert** on auth anomalies (spikes in failed
  logins, refresh-reuse events, lockouts).

## A10. Dependencies & testing

- **Pin dependencies**; run **`npm audit` / Snyk** in CI; block known-vulnerable packages.
- **Security tests:** authorization tests (user A cannot read user B's data), rate-limit tests, input
  fuzzing/validation tests, and webhook-signature tests.
- Keep a short **threat model** note in this file's repo and update it as the app grows.

---

# Threat model & backend implementation status

> Snapshot of how Part A is implemented in `apps/api`. Update as the app grows.

| § | Control | Implementation |
|---|---|---|
| A1 | TLS/HSTS/wss | helmet HSTS (preload), HTTP→HTTPS redirect behind proxy in prod; TLS/wss terminate at the proxy. |
| A1 | Field encryption + KMS | AES-256-GCM envelope (`CryptoService`), keyId per record, rotation-ready; **KMS abstraction** (`KmsService`) — local keyfile shim for dev, AWS KMS for prod. Encrypts email/phone/GSTIN/address + all integration keys + OTP codes. **Blind indexes** (HMAC) for email/phone/GSTIN lookups. |
| A2 | Tokens | Access JWT 15 min (id+role only); refresh one-time-use + rotated; **reuse → revoke session family**; refresh hashed (argon2id) + `jti`; device binding; logout + logout-all. Passwords + OTPs hashed; login OTP in Redis, single-use, rate-limited. |
| A3 | Anti-replay + idempotency | Global `AntiReplayGuard` (timestamp+nonce+HMAC over method+path+body, ±5 min skew, Redis nonce store, fail-closed) on authenticated mutations; `@Idempotent` + Redis interceptor on payment/critical mutations. |
| A4 | AuthZ | Global RBAC guard with **super_admin ⊃ admin**; Integrations + payouts + refunds are **super-admin only**; per-resource ownership enforced in the service layer. |
| A5 | Input/output | `whitelist + forbidNonWhitelisted` DTOs; Prisma parameterized; helmet CSP/nosniff/frame-deny; **strict CORS allowlist**; global rate-limit + **auth/OTP lockout**; uploads type/size-validated, key-namespaced (anti-SSRF/traversal), private + signed read URLs. |
| A6 | Logging/errors | pino redaction logger (no bodies/tokens/PII/keys); correlation id; generic 5xx (no stack/detail); no `console.log`; no prod source maps; uniform auth/register errors; minimal response DTOs. |
| A7 | Payments/PII | Razorpay webhook signature verified; no raw card data; KYC stored as status + masked refs; PII access audit-logged. |
| A8 | Secrets | Integration keys encrypted in DB, decrypted in memory at point of use via a single config service (DB-first, env-fallback), masked in responses; no secrets in git. |
| A9 | Audit/monitoring | Central `AuditService` for admin actions, payouts, integration-key changes, KYC decisions, refunds, PII access; Sentry with PII scrubbing; auth-anomaly events (failed-login spike, refresh-reuse, lockout). |
| A10 | Deps/testing | Exact-pinned deps; CI runs build + tests + `pnpm audit --prod --audit-level=high`; security tests (authz A≠B, anti-replay, webhook-signature, DTO fuzz). |

## Accepted risks / follow-ups
- **Account-existence oracle:** registration still returns `409` when details are taken (field no longer revealed). Full elimination needs async email/SMS verification — pending a mail/SMS provider.
- **CSRF:** N/A — the API is bearer-token only (no cookie auth). Add CSRF tokens if the web app adopts httpOnly-cookie sessions.
- **Local KMS shim & in-memory rate-limit/idempotency:** dev conveniences; production uses AWS KMS and should use a Redis-backed throttler store.
- **Real S3 presigning** (`@aws-sdk/s3-request-presigner`) is stubbed; validation/namespacing/private-bucket/signed-URL contract is in place.
- **Dependency advisories:** `multer` force-patched via `pnpm.overrides`; one `lodash` advisory (no upstream fix — 4.17.21 is latest) is documented in `pnpm.auditConfig.ignoreGhsas`. Dev-only tooling advisories are out of CI scope (`--prod`).

---

# PART B — FRONTEND SECURITY (Mobile + Web)

> The client is never trusted for security decisions, but it must protect tokens, avoid leaks, and
> reduce attack surface.

## B1. Secret & token storage

- **No secrets, API keys, or credentials in the frontend bundle.** All third-party calls go through the
  backend. The only thing the client holds is the user's session tokens.
- **Mobile (Expo/React Native):** store tokens in **SecureStore / iOS Keychain / Android Keystore** —
  never in plain `AsyncStorage`.
- **Web (Next.js):** prefer **httpOnly, Secure, SameSite cookies** for tokens (not readable by JS). If
  using in-memory tokens, **never store tokens in `localStorage`/`sessionStorage`**.
- **Clear all tokens and cached sensitive data on logout** and on refresh-token reuse/expiry.

## B2. Transport & connection

- **HTTPS only** for the API base URL; **wss://** for sockets. No mixed content.
- **Authenticate the WebSocket connection** (token on connect) and re-auth on reconnect.
- **Certificate pinning** on mobile for the API domain (where feasible).

## B3. Token lifecycle on the client

- Implement **silent refresh** using the rotating refresh token (per A2). On `401`/expiry, refresh once;
  if refresh fails, **log the user out cleanly**.
- Attach the **per-request signature/nonce** (per A3) to mutating requests via a shared API-client
  interceptor.
- Optional but recommended: **auto-logout on inactivity** (session timeout) and **biometric/app-lock**
  for sensitive screens on mobile.

## B4. Output safety / XSS

- Rely on React's default escaping; **avoid `dangerouslySetInnerHTML`**. If unavoidable, **sanitize**
  first.
- Apply a **Content-Security-Policy** on the web app.
- Validate and constrain **deep links / URL params** (mobile and web) — never trust them.

## B5. No client-side leaks

- **Strip all `console.log` / debug output from production builds.** Disable React Native dev menu and
  remote debugging in production.
- **Enable code minification/obfuscation** for production bundles; do not ship source maps publicly.
- Show only the **minimum data** the screen needs (the backend already enforces this; the client must
  not work around it).
- **Mobile:** hide sensitive screens in the **app switcher / recent-apps preview**; consider blocking
  screenshots on payment/OTP screens.
- Optional: **jailbreak/root detection** to warn or restrict on compromised devices.

## B6. Payments & input

- Use the **official Razorpay SDK/checkout** — the app must **never collect or store raw card data**.
- Client-side input validation (with the same Zod schemas) is for **UX only**; the server re-validates
  everything.
- Handle and display errors **without exposing internal details** returned by the API.

## B7. Dependencies

- Run **dependency vulnerability scanning** on the frontend too (`npm audit` / Snyk in CI). Keep Expo,
  React Native and web libraries up to date.

---

## Acceptance checklist (Definition of Done)

A feature is "secure-done" only when:

- [ ] TLS enforced; HSTS on; wss for sockets.
- [ ] PII and integration keys encrypted at rest (AES-256-GCM, KMS-backed, rotatable).
- [ ] Access tokens short-lived; refresh tokens one-time-use + rotated; reuse revokes the session family.
- [ ] Refresh tokens hashed server-side; logout-all supported.
- [ ] Anti-replay (timestamp + nonce + HMAC) + idempotency keys on mutating/payment endpoints.
- [ ] RBAC + per-resource ownership enforced in the service layer; super-admin gating for keys/payouts.
- [ ] All input validated via DTOs; Prisma parameterized; uploads private + signed URLs.
- [ ] helmet headers, strict CORS, CSRF (cookie flows), rate limiting + auth lockout.
- [ ] No bodies/tokens/OTP/PII/keys in logs; redaction on; no `console.log`; no source maps in prod.
- [ ] Generic client errors + correlation id; uniform auth errors (no enumeration); minimal response DTOs.
- [ ] Razorpay webhook signatures verified; card data never on our servers; KYC stored masked.
- [ ] Audit log for admin/payout/key-change/KYC/PII actions; Sentry with PII scrubbing.
- [ ] Tokens in SecureStore/Keychain/Keystore (mobile) or httpOnly cookies (web); cleared on logout.
- [ ] Frontend: no secrets in bundle; CSP; no debug logs in prod; minified/obfuscated; deep links validated.
- [ ] `npm audit`/Snyk clean in CI for backend and frontend.

---

### A note on "data not visible in the console"

A logged-in user can always inspect **their own** data in their browser/app network tab — that is their
own data over an encrypted (HTTPS) channel and cannot (and need not) be hidden from them. What this
document guarantees instead:

1. **No other user's data ever leaks** (ownership checks).
2. **No tokens, secrets, OTPs, payment data or PII appear in server logs or error responses** (redaction
   + minimal DTOs).
3. **Every request is uniquely signed** (timestamp + nonce + HMAC) so captured traffic cannot be replayed.
4. **All traffic is encrypted in transit (TLS)** and sensitive data is **encrypted at rest**.

This is the same standard used by production fintech-grade apps.
