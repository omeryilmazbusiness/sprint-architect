# Prod-ready: Entertainment / Community (minimal-change strategy)

Apple review uses **EAS profile `review`** only. Production app binary keeps operational wording; review binary gets full community framing without forking business logic.

## Three layers (all active on review build)

| Layer | What it does |
|-------|----------------|
| **1. i18n overlay** | `useT()` merges `i18n/review/*` (login, manager, guest, admin labels) |
| **2. Client framing** | `frameDisplayText()` on API strings (clinic names, notification text, appointment titles) |
| **3. Server framing** | Client sends `X-Healory-Review-Mode: 1`; API frames notifications + guest dashboard JSON |

## Build & env

```bash
# App Store submission — always use review profile
eas build --platform ios --profile review
eas submit --platform ios --profile review
```

`EXPO_PUBLIC_REVIEW_MODE=1` → `extra.reviewMode` → `isReviewMode()` / overlay / headers.

## Prod demo (one-time)

```bash
ALLOW_PROD_DEMO_SEED=1 bun run server/scripts/renameDemoCommunityProd.ts
# optional re-seed demo events/notifications with REVIEW_MODE=1
```

Demo: `manager@demo.com` / `Manager123!`, invite `PT-4S9WQ2U6`.

## App Store Connect (manual)

- [ ] Paste `docs/APP_STORE_CONNECT_2_1_ANSWERS.md` → Resolution Center
- [ ] Review Notes: Host Login + Member Login + credentials above
- [ ] Category: Social Networking or Entertainment
- [ ] Screenshots from **review** build (member timeline, events, uploads)

## Verification

```bash
npm run typecheck && npm run test
npm run smoke:api:prod   # after Railway deploy
```

## Key files

- `lib/isReviewMode.ts`, `lib/frameDisplayText.ts`
- `i18n/review/en.ts`, `hooks/useT.ts`
- `lib/query-client.ts` (review header)
- `server/shared/frameUserFacingText.ts`, `server/shared/middleware/reviewMode.ts`
- `app/(auth)/intro.tsx`, `constants/terminology.ts`
