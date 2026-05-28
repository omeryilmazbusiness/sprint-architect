# App Store review pack — Healory (Guideline 5.1.1 & resubmission)

Use this document when preparing **App Store Connect** metadata, **screenshots**, **Review Notes**, and when deciding whether an **Organization** Apple Developer account is required.

Related: [APP_STORE.md](./APP_STORE.md) (build/TestFlight) · [PRODUCTION.md](./PRODUCTION.md)

---

## 1. Why Apple rejected (5.1.1(ix))

Apple classified Healory as a **regulated health / medical services** app. Under [Guideline 5.1.1(ix)](https://developer.apple.com/app-store/review/guidelines/#health-and-health-research), apps in that category must be submitted from an **Apple Developer Program — Organization** account (company/organization), not an **Individual** account.

**Important:** UI copy changes alone do not guarantee approval. Apple also weighs **app purpose**, **metadata**, **screenshots**, **bundle ID**, and **demo flows** (schedules, providers, service types, travel + documents).

---

## 2. Risk assessment (current codebase)

| Signal | Risk | Status / note |
|--------|------|----------------|
| Individual Developer account | **Blocker** if Apple maintains 5.1.1(ix) classification | Requires Organization enrollment or app transfer |
| Bundle ID `com.healory.healthtour` | Medium | Name suggests health tourism; renaming is a major change |
| App Store subtitle/description with clinic/patient/medical | High | Use neutral copy in §4 |
| Screenshots showing old “Clinic / Doctor / Patient” UI | High | Recapture after EN (or review language) build |
| Guest flow: plan steps, visits, providers | Medium | Copy neutralized; workflow still operational |
| Create member: service list (Dental, IVF, …) | **High** on screenshots | Visible in manager “New Guest”; consider generic labels for review build |
| `medical-outline` icons | Low–medium | Decorative; not HealthKit |
| HealthKit / clinical APIs | Low | Not used |
| Camera / photo / PDF upload (guest) | Medium | **Files** tab on guest track: PDF only for **manager-assigned** document types; auto-deleted on departure |
| Guest data retention | Low–medium | End of departure day purge; self-delete in Profile; see Privacy Policy |
| Public privacy/support URLs | Medium | Keep aligned with neutral wording + retention §7 |
| API paths `/v1/patient`, DB `patients` | Low for review | Not visible in UI; optional aliases in t6 after deploy |
| Demo login failure (missing seed) | **Blocker for review** | Seed `PT-4S9WQ2U6` on production before submit |

**Realistic outcomes**

1. **Organization account** → best path if the product remains operations for travel/service organizations (even with neutral UI).
2. **Neutral reframe + strong metadata** → may pass on Individual account if Apple no longer sees “medical service delivery”; not guaranteed.
3. **Major repositioning** (pure CRM, no service-type catalog, no provider scheduling) → highest effort, still may need Organization if health data is stored.

---

## 3. Fallback plan (Organization account)

Choose one path:

### A. Enroll as Organization (recommended if you have a company)

1. Register/legal entity with **D-U-N-S** number ([Apple help](https://developer.apple.com/support/enrollment/)).
2. Enroll in [Apple Developer Program](https://developer.apple.com/programs/) as **Organization** (not Individual).
3. Wait for verification (often days to weeks).
4. Create App ID `com.healory.healthtour` under the new team (or transfer — see B).
5. Resubmit with same binary or new build; reference new team in Review Notes.

### B. Transfer app to an existing Organization account

1. Organization account holder sends App Transfer invitation ([App Transfer](https://developer.apple.com/help/app-store-connect/transfer-an-app/overview-of-app-transfer/)).
2. Individual account accepts transfer of App Store Connect app + bundle ID.
3. Reconfigure signing in EAS with new Team ID / ASC App ID.
4. Resubmit.

### C. Publish under a partner’s Organization account

Partner owns the listing; you provide builds via their ASC/EAS. Contractual clarity on IP and revenue.

### D. If you have no legal entity

Individual account cannot satisfy 5.1.1(ix) for a regulated-health classification. Options: form a company, use a partner Organization account, or materially change product scope and seek reclassification (uncertain).

---

## 4. App Store Connect — suggested metadata (English)

Use **Business** or **Productivity** as primary category; avoid **Medical** unless you are Organization and intend clinical positioning.

| Field | Suggested text |
|-------|----------------|
| **Name** | Healory |
| **Subtitle** (30 chars) | Operations & guest plans |
| **Promotional text** (optional) | Coordinate schedules, transport, and documents for your organization’s guests. |
| **Description** (short lead) | Healory is a multi-tenant operations platform for organizations that manage guest journeys, team workflows, schedules, and documents. |
| **Description** (bullets) | • Admin: organizations, billing, users\n• Staff: members, providers, visits, services\n• Guest: plan, schedule, assigned files (PDF), profile (access key)\n• Guest data removed after departure or on request\n• Notifications for status updates\n• Secure sign-in for staff and guests |
| **Keywords** | operations,schedule,organization,workflow,guest,team,documents,logistics |
| **Avoid** | clinic, hospital, patient, doctor, treatment, surgery, medical tourism, health records, diagnosis |

**Turkish / other storefronts:** mirror the same positioning; do not reintroduce “klinik / hasta / doktor” in localized metadata.

### Privacy & support URLs

| Field | URL |
|-------|-----|
| Privacy Policy | `https://omeryilmazbusiness.github.io/sprint-architect/privacy/` |
| Support URL | `https://omeryilmazbusiness.github.io/sprint-architect/support/` |
| Marketing URL (optional) | Same GitHub Pages root or company site |

### App Privacy questionnaire (high level)

- **Data collected:** email, name, user ID, other contact info, **files** (guest: PDF uploads for assigned operational document types only; staff: org workflows), diagnostics (if any).
- **Data deletion:** guest operational data is **automatically removed** at end of the **departure date** set by the organization; guests may also request deletion from **Profile → Delete my data**.
- **Not collected for review build:** HealthKit, precise location (unless you enable location features), browsing history.
- **Linked to user:** yes (accounts).
- **Used for:** app functionality, notifications.
- Align answers with [Privacy Policy](../privacy/) §7 (retention).

---

## 5. Review Notes (paste into App Store Connect)

```
Healory is an operations platform for organizations (not a consumer medical app).

DEMO CREDENTIALS
• Staff (Manager): manager@demo.com / Manager123!
• Platform Admin: admin@demo.com / Admin123!
• Guest (access key): PT-4S9WQ2U6
  (Guest tab → enter key → Continue. Requires production seed; contact us if invalid.)

HOW TO TEST
1. Management tab → manager@demo.com → Dashboard, Members, Services, Settings.
2. Admin: sign in as admin@demo.com → Organizations, Users, Invoices.
3. Guest: Guest Login tab → PT-4S9WQ2U6 → Plan / Files / Schedule / Profile.

NOTES
• No HealthKit. Notifications optional.
• Guest may upload PDFs only for document types assigned by their organization (Files tab).
• Guest operational data (profile, plan, visits, uploaded files) is automatically removed after the departure date set by the organization. Guests can also request deletion under Profile → Delete my data.
• This is an operations platform — not a medical records or diagnosis app.
• Support: support@healory.app
```

**Before submit:** run `npm run smoke:api:prod` and confirm guest key login returns 200.

---

## 6. Screenshot checklist

Capture on **production-profile iOS build** with **English** UI (or primary review language). No status bar personal data.

| # | Screen | Route / role | Must show | Must NOT show |
|---|--------|--------------|-----------|----------------|
| 1 | Intro / brand | Fresh install | “Operations platform”, Healory logo | Patient, clinic, medical |
| 2 | Login | Auth | Guest + Management tabs | — |
| 3 | Manager dashboard | manager@demo.com | KPIs, neutral labels | “Clinic suspended” unless testing billing |
| 4 | Members list | Manager → Users | “Members”, search | “Patients”, “Guests” tab only if label is “Members” |
| 5 | Providers | Manager → Users → Providers | “Providers” | “Doctors” |
| 6 | Guest plan | Guest key | “Plan” / steps | Medical/clinical labels |
| 7 | Guest files | Guest → Files tab | Assigned document types, PDF upload | “Medical records”, lab results |
| 8 | Guest schedule | Guest | “Visits” / schedule | “Appointments” in title |
| 9 | Guest profile | Guest → Profile | Institution info; optional “Delete my data” | Clinical disclaimers |
| 10 | Admin organizations | admin@demo.com | “Organizations” list | “Clinics” |
| 11 | Settings / legal | Guest or Manager | Privacy link works (retention §7) | — |

**iPad:** only if `supportsTablet` is enabled (currently `false` in `app.json`).

**Optional 6.5" / 6.7" sets:** reuse same flows; Apple scales.

---

## 7. Pre-submission checklist

### Code & build

- [ ] `npm run typecheck` passes
- [ ] `npm run smoke:api:prod` — manager/admin/guest login OK
- [ ] Production: `npx tsx server/scripts/seedDemoGuestKey.ts` (guest key)
- [ ] Backend deploy with t6 aliases (optional; not required for review)
- [ ] EAS `production` profile → `EXPO_PUBLIC_API_URL` = HTTPS Railway URL
- [ ] No ATS HTTP exceptions in production iOS build
- [ ] Version/build number incremented

### App Store Connect

- [ ] Organization team selected (if using 5.1.1(ix) path)
- [ ] Privacy + Support URLs live
- [ ] Metadata §4 applied
- [ ] Screenshots §6 recaptured
- [ ] Review Notes §5 pasted
- [ ] Demo accounts verified on **same build** as submitted IPA
- [ ] Export compliance / encryption answered
- [ ] Content rights / age rating completed

### Consistency audit

- [ ] No “clinic / patient / doctor / appointment / treatment” in **App Store** text
- [ ] Public privacy/support pages match app behavior (retention + guest file upload)
- [ ] Intro pillars: Member Care / Multi-Site (not Patient Care / Multi-Clinic)

---

## 8. If rejected again

1. Read Resolution Center text — note exact guideline (5.1.1(ix) vs other).
2. If still **Individual vs Organization** → proceed with §3; do not only change strings.
3. If **misleading metadata** → fix screenshots/description.
4. If **broken demo** → fix seed/API; reply in Resolution Center with updated credentials.
5. Request phone call / App Review appointment only after demo is verified working.

---

## 9. Quick reference

| Item | Value |
|------|--------|
| Bundle ID | `com.healory.healthtour` |
| Production API | `https://sprint-architect-production.up.railway.app` |
| EAS project | `f9e13049-e0fb-4860-997c-87e5201e9f02` |
| Smoke test | `npm run smoke:api:prod` |
