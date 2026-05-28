# App Store & TestFlight (share-ready)

## App icon

Brand assets live under `assets/images/` (Expo) and `assets/icons/` (native size sets).

| File | Role |
|------|------|
| `icon.png` | 1024×1024 App Store / Expo icon |
| `splash-icon.png` | Splash screen |
| `logo.png` / `healory-circle.png` | In-app branding |

After replacing icons, refresh the native project:

```bash
npx expo prebuild --clean
```

## Identifiers

| Platform | Value |
|----------|--------|
| iOS bundle ID | `com.healory.healthtour` |
| Android package | `com.healory.healthtour` |
| URL scheme | `healory` |

## One-time setup

1. [Apple Developer](https://developer.apple.com) — App ID for `com.healory.healthtour`
2. [App Store Connect](https://appstoreconnect.apple.com) — create app, note **ASC App ID**
3. [Expo EAS](https://expo.dev) — `npm i -g eas-cli && eas login`
4. Link project: `eas init` → set `EAS_PROJECT_ID` in EAS secrets / `app.config` extra
5. Update [`eas.json`](../eas.json) `submit.production.ios` with your Apple ID, team ID, ASC app ID

## Build for TestFlight (internal share)

```bash
# Production API URL (HTTPS) — set in EAS dashboard or eas.json production.env
eas build --platform ios --profile production

# Submit to TestFlight
eas submit --platform ios --profile production
```

Preview / internal APK:

```bash
eas build --platform ios --profile preview
eas build --platform android --profile preview
```

## Local simulator (development)

```bash
npm run db:up
npm run dev:setup
npm run server:dev          # terminal 1
npm run expo:ios:sim        # terminal 2 — iPhone 15 simulator
```

Use `EXPO_PUBLIC_API_URL=http://127.0.0.1:5001` (or your API port) in `.env`.

## Public Support & Privacy (GitHub Pages)

Hosted from the `/docs` folder. See [GITHUB_PAGES.md](./GITHUB_PAGES.md).

After enabling Pages on GitHub:

| Field | Path |
|-------|------|
| Support URL | `https://<user>.github.io/<repo>/support/` |
| Privacy Policy URL | `https://<user>.github.io/<repo>/privacy/` |

## App Store review (resubmission)

Full checklist, metadata copy, screenshot plan, **Guideline 5.1.1(ix)** risk assessment, and Organization-account fallback:

→ **[APP_STORE_REVIEW.md](./APP_STORE_REVIEW.md)**

Quick checks:

- [ ] Privacy & Support URLs in App Store Connect
- [ ] `npm run smoke:api:prod` passes (seed guest key on production)
- [ ] Review Notes + demo accounts in APP_STORE_REVIEW.md §5
- [ ] Screenshots recaptured (neutral EN UI)
- [ ] Organization Developer account (if Apple requires 5.1.1(ix))

## Versioning

- `app.json` → `version` (marketing version, e.g. `1.0.0`)
- EAS `production` profile → `autoIncrement` for build numbers
- Override: `IOS_BUILD_NUMBER` / `ANDROID_VERSION_CODE` env at build time
