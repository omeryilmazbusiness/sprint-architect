# Prod-ready tasks — App Store / regulated-health risk reduction

## Prod readiness audit — 28 May 2026

| Layer | Status | Evidence |
|-------|--------|----------|
| **Local code** | 🟢 Gates pass | `npm run prod:ready:check` · `db:push:test` in `npm test` · lint 0 errors |
| **Production API** | 🔴 Old build | `POST /v1/patient/account/delete` → **404** · `PT-4S9WQ2U6` → **401** · deploy `main` required |
| **Prod DB** | 🔴 Pending | Run `db:push` on prod + `ALLOW_PROD_DEMO_SEED=1 npm run db:seed:demo-guest` |
| **App Store submit** | 🔴 Not ready | Screenshots ⬜ · Organization account ⬜ · metadata/ASC not applied |
| **CI tests** | 🟢 | `db:push:test` in workflow · expect 94/94 after push |

**Verdict:** **Not prod-ready for App Store resubmission** until (1) commit + push `main` → CD deploy, (2) prod `db:push` or migration, (3) `seedDemoGuestKey` on prod, (4) new iOS build with `EXPO_PUBLIC_API_URL` prod, (5) screenshots + business account decision.

```bash
# Local quality gate (before commit)
npm run prod:ready:check

# After deploy — expect account/delete → 401 (not 404), guest PT-4S9WQ2U6 → 200
npm run smoke:api:prod
ALLOW_PROD_DEMO_SEED=1 npm run db:seed:demo-guest   # DATABASE_URL must point at prod
npx tsx scripts/backfill-guest-retention-schedule.ts  # existing guests with departureDate
```

---

Last audit: manager, guest, admin UI surfaces. Goal: no user-visible **clinic / patient / doctor / appointment / treatment / medical** framing; use **institution / member / provider / visit / service**.

---

## P0 — Blockers for review (do before next IPA)

| ID | Task | Owner area | Status |
|----|------|------------|--------|
| P0-1 | Replace all UI copy **Organization → Institution** (en/tr/es/ru) | i18n | ✅ |
| P0-2 | Demo seed name `Demo Clinic` → `Demo Institution` (+ DB update on seed) | `server/seed.ts` | ✅ (re-run seed on env) |
| P0-3 | Remove hardcoded English "clinic/patient/doctor/appointment" in components | `components/`, `app/` | ✅ legacy tabs, settings, operations, admin rows |
| P0-4 | Neutralize **service type** labels (Dental, IVF, Hair Transplant…) in create-guest flow | `constants/guestRequestedServiceLabels.ts`, i18n bundles | ✅ Service Package A–M |
| P0-5 | Production: `git push main` → CD, `db:push`, `ALLOW_PROD_DEMO_SEED=1 npm run db:seed:demo-guest` | ops | ⬜ |
| P0-6 | Recapture App Store screenshots (EN, no medical/service list visible) | ASC | ⬜ |
| P0-7 | **Organization** Apple Developer account OR accept 5.1.1(ix) path | business | ⬜ |

---

## P1 — High risk (Apple metadata & deep UI)

| ID | Task | Notes |
|----|------|-------|
| P1-1 | App Store Connect metadata per `APP_STORE_REVIEW.md` (Institution not Clinic) | |
| P1-2 | Rename admin tab route label only: `clinics` tab shows "Institutions" (done via i18n) | |
| P1-3 | Guest upload (SOLID) + departure purge + T−1h manager PDF/ZIP | [PLAN_GUEST_UPLOAD_AND_RETENTION.md](./PLAN_GUEST_UPLOAD_AND_RETENTION.md) — Epics A–F ✅ (G QA ⬜) |
| P1-4 | `medical-outline` icons → `person-outline` / `briefcase-outline` where decorative | ✅ |
| P1-5 | Notification titles from API ("Clinic Suspended", "Doctor Assigned") → neutral server copy | `managerRoutes.ts`, `billingService.ts` | ✅ |
| P1-6 | Email templates: clinic/patient wording | `server/email/templates.ts` | ✅ partial (monthly report) |
| P1-7 | Bundle ID `com.healory.healthtour` — long-term rename optional | |

---

## P2 — Medium (polish)

| ID | Task | Notes |
|----|------|-------|
| P2-1 | `expo-clipboard` native module — verify dev build after pod install | |
| P2-2 | Lint errors (`react/no-unescaped-entities`) | |
| P2-3 | tr/es/ru script re-run + manual QA for broken grammar | |
| P2-4 | Admin route folder `(admin)/clinics` — cosmetic rename only if needed | |
| P2-5 | API field `clinicName` display-only alias `institutionName` (t6 done on server) | |

---

## P3 — Optional / post-approval

| ID | Task | Notes |
|----|------|-------|
| P3-1 | DB/API rename clinic→institution | breaking |
| P3-2 | Remove `expo-document-picker` if unused | |
| P3-3 | Full regression + `npm run smoke:api:prod` in CI | |

---

## Screen audit checklist (manager / guest / admin)

### Manager
- [x] Settings section header → Institution (i18n `clinicSection`)
- [ ] Header subtitle shows API `clinic.name` → fix seed data name
- [ ] Users tabs Guests/Doctors → Members/Providers (i18n)
- [ ] Create guest success "added to your clinic"
- [ ] Schedule cards "Today's Appointments"
- [ ] Doctors carousel empty state "treatment plan"
- [ ] Service picker medical procedure names

### Guest
- [ ] Profile section labels (Institution Info)
- [ ] Dashboard doctor chip / section
- [ ] Schedule filters "Appointments"
- [ ] Track step "procedure" subcopy

### Admin
- [ ] Clinics list/page titles (Institutions)
- [ ] Create user "Clinic is required" error string
- [ ] Notifications clinic name display (data OK, labels neutral)
- [ ] User list clinic column header

---

## Verification

```bash
npm run typecheck:app
npm run smoke:api:prod
# Grep gate (UI strings only — expect hits in routes/vars):
rg -i '\\bclinic\\b|\\bpatient\\b|\\bdoctor\\b' app components i18n --glob '*.{tsx,ts}' | rg -v 'clinicId|clinicName|/clinics|ClinicInfo|queryKey'
```
