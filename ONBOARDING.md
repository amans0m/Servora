# Servora — Developer Onboarding & Setup Guide

Welcome to **Servora**, an IT-services marketplace (think "Urban Company for IT"). This
guide gets a new engineer from a fresh `git clone` to all surfaces running locally.

> **TL;DR** — Install prereqs → `pnpm install` → `pnpm db:up` → seed the DB → run the
> app you need. Everything also runs in **mock mode with no backend** if you just want
> to click through the UI.

---

## 1. What's in the repo

A **Turborepo monorepo** managed with **pnpm workspaces**.

```
Servora/
├── apps/
│   ├── api/             NestJS backend (Prisma + PostgreSQL/PostGIS + Redis/BullMQ + Socket.IO)
│   ├── web/             Next.js (App Router) — marketing site + admin panel (secure BFF)
│   ├── customer-app/    Expo / React Native — customer mobile app (iOS / Android / Web)
│   └── engineer-app/    Expo / React Native — engineer mobile app
├── packages/
│   ├── mobile-shared/   Shared RN theme, UI components, services, stores, hooks
│   ├── types/           Shared TypeScript types
│   ├── sdk/             API client SDK
│   ├── ui/              Shared UI primitives
│   └── config/          Shared tsconfig / eslint config
├── docker-compose.yml   Local Postgres (PostGIS) + Redis
└── package.json         Workspace root (pnpm + turbo)
```

**Security notes** worth reading before touching auth/payments:
`apps/web/SECURITY-NOTES.md` and `apps/MOBILE_SECURITY.md`.

---

## 2. Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| **Node.js** | **≥ 20** (24.x tested) | use `nvm` |
| **pnpm** | **9.12.0** | `corepack enable && corepack prepare pnpm@9.12.0 --activate` |
| **Docker Desktop** | latest | runs Postgres + Redis |
| **Git** | latest | |
| **Expo CLI** | bundled (via `pnpm`) | no global install needed |
| **Android Studio** | optional | only for the Android emulator |
| **Xcode** | optional (macOS) | only for the iOS simulator |

> The backend needs Postgres + Redis. The **web/mobile apps do NOT need the backend**
> when running in mock mode (see §6).

---

## 3. First-time setup

```bash
git clone https://github.com/amans0m/Servora.git
cd Servora

# Install ALL workspace deps in one shot
pnpm install
```

That's it for code. Next, pick what you want to run.

---

## 4. Running the backend (apps/api)

The backend talks to Postgres + Redis. Third-party providers (Razorpay, Maps, KYC, SMS…)
are **mocked automatically when no key is set**, so you can run the full backend with
zero external accounts.

```bash
# 1. Start infra (Postgres on :5433, Redis on :6380 — chosen to avoid clashing
#    with any local Postgres/Redis already on the default 5432/6379).
pnpm db:up                     # = docker compose up -d

# 2. Configure env
cp apps/api/.env.example apps/api/.env
#   The defaults already point at the docker infra above — works out of the box.
#   Leave all the provider keys BLANK for local dev (they fall back to stubs).

# 3. Apply DB schema + seed sample data
pnpm --filter @servora/api exec prisma migrate deploy
pnpm --filter @servora/api exec prisma db seed

# 4. Run the API (watch mode)
pnpm api:dev                   # http://localhost:3000
```

**Stop infra:** `pnpm db:down` (data persists in Docker volumes).

### Seeded login accounts (password for all: `Servora@123`)

| Email | Role |
|-------|------|
| `super@servora.io` | super_admin (sees **Integrations**) |
| `admin@servora.io` | admin |
| `ops@acme.example` | customer (org contact) |
| `it@globex.example` | customer |
| `rohit@eng.example` | engineer |
| `asha@eng.example` | engineer |

---

## 5. Running the web app (apps/web — marketing + admin)

```bash
pnpm --filter @servora/web dev          # default port 3001
```

> **Port note:** the script defaults to **3001**. If something else (e.g. Grafana)
> already holds 3001, run on another port: `pnpm --filter @servora/web exec next dev -p 3002`.

- Marketing site: `http://localhost:<port>/`
- Admin login: `http://localhost:<port>/login`
  - **super-admin:** `super@servora.io` · **admin:** `admin@servora.io`
  - In **mock mode any password works**; against the real backend use `Servora@123`.

**Architecture:** the browser never sees tokens. The Next.js **BFF** (route handlers under
`app/api/`) holds tokens in **httpOnly + Secure + SameSite=strict cookies**, signs each
upstream request server-side (HMAC), and does silent refresh. Admin auto-logs-out after
15 min of inactivity. **Integrations** (API keys) is super-admin only and gated server-side.

---

## 6. Mock mode vs. real backend (the one switch)

Every frontend can run on **sample data with no backend**, or against the real API.

| Surface | Env var | Mock (default) | Real backend |
|---------|---------|----------------|--------------|
| **web** (server) | `SERVORA_USE_MOCKS` | `true` | `false` + set `SERVORA_API_URL=http://localhost:3000` |
| **web** (client) | `NEXT_PUBLIC_USE_MOCKS` | `true` | `false` |
| **mobile** | `EXPO_PUBLIC_USE_MOCKS` | `true` | `false` + set the API URL |

In mock mode, logins accept any credentials and all data is seeded sample data — perfect
for UI work, demos, and onboarding without standing up infra.

---

## 7. Running the mobile apps (customer-app / engineer-app)

Each app runs on **iOS simulator, Android emulator, or the browser (Expo web)**.

```bash
# Customer app
pnpm --filter customer-app start         # opens Expo dev server; press i / a / w
# or directly:
pnpm --filter customer-app web           # browser  → http://localhost:8081 (or next free)
pnpm --filter customer-app ios           # iOS simulator (needs Xcode)
pnpm --filter customer-app android       # Android emulator (needs an AVD running)

# Engineer app — same commands with `engineer-app`
pnpm --filter engineer-app start
```

> If you run both apps at once, Expo picks separate ports (8081, 8082, 8083 …).

### Android emulator (Android Studio) — one-time setup

1. Install Android Studio → **More Actions → SDK Manager** → install a **system image**
   (e.g. *Android 14 / API 34*, `arm64-v8a` on Apple Silicon).
2. **Device Manager → Create device** → pick a Pixel → finish. Start the emulator.
3. With the emulator booted, run `pnpm --filter customer-app android`.

> **Native modules:** `react-native-maps` and `react-native-razorpay` are
> platform-split. On the **web** build they fall back to placeholders/stubs. On a
> device/emulator they use the real native module — the **maps** and **pay** screens
> need a **dev build** (or Expo Go where supported), not just the web bundle.

---

## 8. Common scripts (from repo root)

| Command | What it does |
|---------|--------------|
| `pnpm install` | install all workspace deps |
| `pnpm db:up` / `pnpm db:down` | start / stop Postgres + Redis |
| `pnpm api:dev` | run backend in watch mode |
| `pnpm --filter @servora/web dev` | run web (marketing + admin) |
| `pnpm --filter customer-app start` | run customer app |
| `pnpm --filter engineer-app start` | run engineer app |
| `pnpm build` | turbo build everything |
| `pnpm test` | run tests across the workspace |
| `pnpm lint` | lint across the workspace |

Per-app type-check: `pnpm --filter <app> typecheck`.

---

## 9. Security & conventions (please follow)

- **No secrets in git.** `.env`, `.keys/`, `*.kms.json`, signing keys are git-ignored.
  Provider keys live in the DB (Admin → Integrations, encrypted), env is fallback only.
- **No tokens in localStorage** (web) — they live in httpOnly cookies via the BFF.
- **Mobile tokens** go in SecureStore / Keychain / Keystore — never plain AsyncStorage.
- **Payments:** always use the official Razorpay SDK; never collect/store raw card data.
- **No `console.log`** in production paths (web strips them in prod builds).
- Sensitive screens (OTP, payment) block screenshots on mobile.
- Branch off `main`, open a PR. Don't commit `node_modules`, `.next`, `.expo`, `dist`.

---

## 10. Troubleshooting

| Symptom | Fix |
|---------|-----|
| Web buttons dead, console shows **CSP `unsafe-eval`** error | dev CSP already allows eval; **hard-refresh** `Cmd/Ctrl+Shift+R`. Make sure you're on the Servora port, not Grafana/other app on 3001. |
| `EADDRINUSE` on 3000/3001 | another process (often Docker Grafana on 3001) holds the port — run on a different port. |
| Postgres/Redis won't start | host 5432/6379 already in use — we already remap to **5433/6380**; check nothing else grabbed those. |
| Prisma `migrate dev` hangs (non-interactive) | use `prisma migrate deploy` (as in §4). |
| Expo: `@babel/runtime` / module resolution errors | each app already ships a `metro.config.js` for the monorepo; run `pnpm install` again. |
| Android: `emulator -list-avds` empty | create an AVD in Android Studio (§7). |
| `pnpm audit` flags Next/tar/lodash | known + documented in root `pnpm.auditConfig.ignoreGhsas` and `apps/web/SECURITY-NOTES.md`. |

---

## 11. Where to look next

- Backend modules & API surface: `apps/api/src/`
- DB schema & seed: `apps/api/prisma/`
- Web BFF & admin: `apps/web/src/app/api/`, `apps/web/src/app/admin/`
- Shared mobile building blocks: `packages/mobile-shared/src/`
- Security implementation notes: `apps/web/SECURITY-NOTES.md`, `apps/MOBILE_SECURITY.md`

Questions? Ping the project owner (**aman@wellnessextract.com**).
