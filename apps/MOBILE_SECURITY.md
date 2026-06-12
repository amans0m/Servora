# Mobile frontend security (SECURITY.md Part B)

Status of Part B controls in `customer-app` / `engineer-app` (shared code in `packages/mobile-shared`).

| § | Control | Implementation |
|---|---|---|
| B1 | No secrets in bundle | All third-party calls go through the backend; only `EXPO_PUBLIC_*` non-secret config is inlined. Razorpay key + order come from the backend at pay time. |
| B1 | Token storage | `expo-secure-store` (iOS Keychain / Android Keystore) via `secureStore.ts`; web keeps tokens in memory only (never `localStorage`). Cleared on logout and on refresh failure (`session.store.ts`). |
| B2 | Transport | API client enforces `https://` (prod); sockets use `wss://` (`createSocket`). Socket authenticated with the token on connect and **re-authenticated on every reconnect** (auth callback). |
| B3 | Token lifecycle | Silent one-shot refresh with the rotating refresh token; on failure → clean logout. Every mutating request carries `x-timestamp` + `x-nonce` + `x-signature` (HMAC) via the shared client (matches backend A3). |
| B4 | Output / deep links | React escaping (no `dangerouslySetInnerHTML`). Deep links go through an **allowlisted, param-validated** linking config (`navigation/linking.ts`). |
| B5 | No leaks | `babel-plugin-transform-remove-console` strips `console.*` in production; no source maps in prod; **screenshots blocked** on OTP/payment screens (`useScreenCaptureGuard` on Complete-&-pay, Live-tracking, Start-job, Close-job); **app-switcher privacy overlay** (`AppPrivacyOverlay`) hides content when backgrounded. |
| B6 | Payments | Official **Razorpay checkout** (`payments.native.ts`); the app never collects/stores raw card data. Client validation is UX-only; the server re-validates and captures. |
| B7 | Dependencies | Exact-pinned; audited via the repo CI (`pnpm audit`). |

## Requires a dev build / hosting config (documented, not in Expo Go)
- **Certificate pinning (B2):** needs a custom dev client + a native pinning module
  (e.g. `react-native-ssl-pinning`) or `expo-build-properties` ATS / Android
  network-security-config. HTTPS + ATS are enforced; pinning is wired at the
  native layer in a dev/production build.
- **Web CSP (B4):** Expo Web's single-output `index.html` isn't customised here;
  set `Content-Security-Policy` (+ `X-Content-Type-Options`, frame-deny) at the
  static host / CDN. The backend already sends these headers for its own routes.
- **Jailbreak/root detection (B5, optional):** add in a dev build if required.

## Mock → real switch
`services/config.ts` `useMocks` (env `EXPO_PUBLIC_USE_MOCKS`) flips the data
layer between the mock layer and the real NestJS client. Sockets + push only
connect against the real backend (`!useMocks`).
