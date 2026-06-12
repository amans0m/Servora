# Servora

IT-services marketplace — businesses book verified IT engineers (network, cloud, security, sys-admin, helpdesk); the platform auto-dispatches the nearest skill-matched engineer, tracks them live, and verifies completion with OTPs. **Payment is collected only on completion.**

A single TypeScript **Turborepo** monorepo. One backend (`apps/api`, NestJS) is the source of truth for all four surfaces (marketing site, admin panel, customer app, engineer app).

> This repo is being built backend-first, in phases, following the build order in `Servora-Tech-Stack`. **All 7 phases are built — the `apps/api` backend is feature-complete per the spec.**

---

## What's in this repo today (Phase 1 — foundation)

```
servora/
├─ apps/
│  └─ api/                  # NestJS backend (the only thing built so far)
├─ packages/
│  ├─ types/                # shared DTOs / Zod schemas (placeholder)
│  ├─ sdk/                  # typed API client from OpenAPI (placeholder)
│  ├─ ui/                   # shared design tokens (placeholder)
│  └─ config/               # shared tsconfig preset
├─ docker-compose.yml       # local Postgres (PostGIS) + Redis
├─ turbo.json
├─ pnpm-workspace.yaml
└─ package.json
```

Inside `apps/api/`:

- **`prisma/schema.prisma`** — the complete data model (every entity from Tech-Stack §8) + an idempotent **seed** script.
- **`src/config/`** — env validation + the **integrations-config service** (resolves every third-party key **DB-first, env-fallback** per §10).
- **`src/database/`** — `PrismaService`.
- **`src/common/`** — RBAC guards, decorators (`@Roles`, `@Public`, `@CurrentUser`), and a consistent exception filter.
- **`src/modules/auth`** — JWT access/refresh + SMS-OTP login, with refresh-token rotation.
- **`src/modules/users`** — base users + `GET /users/me`.
- **`src/modules/kyc`** — Surepass GST (customer) + Aadhaar/PAN/bank (engineer) behind a single mockable `surepass.client.ts`; gates engineer activation on all-checks-pass → pending admin approval (§5).
- **`src/modules/customers`** — business profile + addresses (PostGIS-synced).
- **`src/modules/engineers`** — profile, skills, availability (going online is gated on admin approval), and admin approve/reject (audit-logged).
- **`src/modules/catalog`** — services + add-ons; public list/detail (marketing + customer app), admin CRUD + live toggle.
- **`src/modules/coupons`** — admin CRUD + live toggle, customer-facing validate/preview, redemption recorded at booking.
- **`src/modules/bookings`** — confirm booking (**no charge**), custom-quote requests, customer list with filter chips, reschedule/cancel, admin jobs table + price-a-quote; JobEvent timeline; pricing = subtotal − coupon discount + 18% GST. Immediate bookings auto-start dispatch.
- **`src/modules/dispatch`** — Redis GEO matching (online + skill-matched + in-range + free), ranked offers (distance + rating + load) pushed over WebSocket with a countdown; decline/timeout → next → widen radius → admin manual assign. Admin live-dispatch controls (unassigned queue, best matches, auto-assign, manual assign).
- **`src/modules/tracking`** — live-location Socket.IO gateway: assigned engineer streams position, customer/admin subscribe per booking; pings refresh the geo index.
- **`src/modules/otp`** — start OTP (arrival) + **payment-gated completion OTP**; codes AES-encrypted, single-use, rate-limited; revealed to the customer, verified on engineer entry.
- **`src/modules/payments`** — Razorpay wrapper (auto-mock): order with **manual capture at booking** (authorize, no charge), **capture at completion**, signed webhook → marks captured → **completion OTP generated only here**.
- **`src/modules/payouts`** — RazorpayX wrapper (auto-mock): on close, **payout = captured amount − tier commission** (Bronze 25% → Platinum 15%), released via a BullMQ worker.
- **`src/modules/bookings` (lifecycle)** — engineer arrive/start-OTP → in-progress → proof upload (S3-stub) → complete-work → customer pay (capture) → reveal completion OTP → engineer close → payout.
- **`src/modules/ratings`** — two-way ratings: customer→engineer (**public**, rolls up engineer + service rating), customer→platform (**internal**), engineer→customer (**admin-only**).
- **`src/modules/incentives`** — admin program CRUD + live toggle, tier definitions, engineer tier progress + active quests; **auto tier-upgrade and quest awards on job completion**; tier feeds commission (Phase 5) and **priority dispatch** (Phase 4 ranking).
- **`src/modules/notifications`** — push/SMS/email log + stubbed providers (FCM/MSG91/SES via integrations-config); user inbox; emits on payout release + completion-OTP ready.
- **`src/modules/disputes`** — customer/engineer raise, admin triage + resolve/reject (audit-logged).
- **`src/modules/admin`** — **encrypted Integrations** (save/test/toggle keys → applied instantly, completing the DB-first loop), dashboard KPIs + 7-day revenue, customers table (jobs/LTV/engineer-given rating), payments reconciliation, audit-log surfacing.
- **`src/redis`** — ioredis client + `GeoService`. **`src/websockets`** — WS JWT auth. **`src/storage`** — S3 signed-URL stub. **`src/jobs`** — BullMQ dispatch-timeout + payout workers.

---

## Prerequisites

- **Node.js 20+**
- **pnpm 9+** — `corepack enable` (ships with Node) then `corepack prepare pnpm@latest --activate`
- **Docker** (for local Postgres + Redis)

---

## Quick start

```bash
# 1. Install dependencies (from the repo root)
pnpm install

# 2. Start Postgres (PostGIS) + Redis
pnpm db:up            # == docker compose up -d

# 3. Configure the API environment
cp apps/api/.env.example apps/api/.env
#   The defaults already match docker-compose. No third-party keys are
#   needed to run locally — providers are stubbed/optional.

# 4. Generate the Prisma client + run the first migration
pnpm --filter @servora/api db:generate
pnpm --filter @servora/api db:migrate        # creates & applies the initial migration

# 5. Seed sample data (services, 1 admin, 2 customers, 2 engineers)
pnpm --filter @servora/api db:seed

# 6. Start the API in watch mode
pnpm api:dev
```

API: **http://localhost:3000/api** · Swagger docs: **http://localhost:3000/api/docs**

> The first `db:migrate` enables the PostGIS extension (the schema declares it) — that's why Postgres uses the `postgis/postgis` image.

### Seeded accounts (password `Servora@123`)

| Email | Role | Notes |
|---|---|---|
| `admin@servora.io` | admin | |
| `ops@acme.example` | customer | GST-verified, has an address |
| `it@globex.example` | customer | unverified |
| `rohit@eng.example` | engineer | approved + online (Gold tier) |
| `asha@eng.example` | engineer | pending KYC |

---

## Trying the auth flow

```bash
# Email + password login
curl -s localhost:3000/api/v1/auth/login \
  -H 'content-type: application/json' \
  -d '{"email":"admin@servora.io","password":"Servora@123"}'

# SMS-OTP login (dev returns the code so you can test without an SMS provider)
curl -s localhost:3000/api/v1/auth/otp/request \
  -H 'content-type: application/json' -d '{"phone":"+919000000020"}'
# → { "sent": true, "devCode": "1234" }   ← use that code:
curl -s localhost:3000/api/v1/auth/otp/verify \
  -H 'content-type: application/json' -d '{"phone":"+919000000020","code":"1234"}'

# Authenticated request
curl -s localhost:3000/api/v1/users/me -H "authorization: Bearer <accessToken>"
```

---

## Useful scripts

| Command | What it does |
|---|---|
| `pnpm db:up` / `pnpm db:down` | Start / stop local Postgres + Redis |
| `pnpm api:dev` | Run the API in watch mode |
| `pnpm --filter @servora/api db:migrate` | Create & apply a dev migration |
| `pnpm --filter @servora/api db:seed` | Seed sample data |
| `pnpm --filter @servora/api db:studio` | Open Prisma Studio |
| `pnpm --filter @servora/api build` | Compile the API |
| `pnpm --filter @servora/api test` | Run tests |

---

## How integration keys work (§10)

All third-party keys (Surepass, Razorpay, RazorpayX, Google Maps, FCM, MSG91, S3, email, Sentry) are designed to be managed at runtime from **Admin → Integrations**, stored **encrypted in the database**. Every provider client resolves keys through `IntegrationsConfigService`, which reads the **DB first and falls back to the env var** when unset.

Phase 1 ships that resolution contract + the env-fallback path. The admin endpoint that writes the encrypted DB rows arrives in Phase 7 — so for now, keys come from `apps/api/.env` (and most can be left blank locally).

---

## Build phases (Tech-Stack §13)

1. **Foundation** ✅ — monorepo, auth + RBAC, user roles, Postgres schema.
2. **Onboarding** ✅ — customer GST + engineer KYC via Surepass; admin approval.
3. **Catalog + booking** ✅ — services, confirm booking (no charge), coupons.
4. **Dispatch + tracking** ✅ — Redis geo matching, WebSocket offers, live map.
5. **Completion + payments** ✅ — proof, pay-on-completion (authorize/capture), OTP gate, payouts.
6. **Trust + growth** ✅ — two-way ratings & reviews, incentives & tiers.
7. **Admin depth + hardening** ✅ — dashboards, disputes, encrypted Integrations, audit logging.

---

## Source documents

- `Servora-Tech-Stack (1).docx` — architecture, stack, data model, directory structure (source of truth).
- `Servora-Component-Brief.docx` — every screen/component across the four surfaces.
- `servora-prototype (1).html` — clickable UI prototype.
