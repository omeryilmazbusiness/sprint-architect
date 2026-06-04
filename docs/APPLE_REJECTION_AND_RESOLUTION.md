# Apple rejection (1.1.0 build 5) — what happened & how we close it

## Apple did NOT hard-reject with 5.1.1(ix) in this message

This email is **Guideline 2.1 — Information Needed** (questions + broken demo), not a final “regulated services / Organization account” block. You must **answer in Resolution Center** and ship a **new binary (1.2.1+)** with updated copy.

---

## What Apple is asking (mapped)

| Apple text | What they mean | Our answer |
|------------|----------------|------------|
| “Highly regulated services” | They think the app delivers medical/professional services | **No** — community/events coordination only (`APP_STORE_CONNECT_2_1_ANSWERS.md`) |
| Which institutions provide services? | Who is the provider on the platform? | **None via the app** — independent communities |
| Omer Yilmaz relationship? | Are you a clinic/provider? | **Developer only** |
| Who uses Guest accounts? | End-user role | **Members** with **invite codes** |
| What organizations? | B2B target | **Event/community organizers** |
| Could not sign in `PT-4S9WQ2U6` | They used it as **username/password** | It is an **invite code** on **Member Login** tab; ASC must use `manager@demo.com` / `Manager123!` in sign-in fields |

---

## Why you still saw INSTITUTION

1. **Build 1.1.0 (5)** was compiled **before** community i18n landed.
2. Some labels were literally `"INSTITUTION"` in `i18n/en.ts` (`adminUsers.clinicSection`) — **fixed to `COMMUNITY`**.
3. Turkish locale still said **KURUM** — **reframed to TOPLULUK**.
4. Review overlay only applied with a flag — **base prod i18n now community-first**.

After pull: **restart Metro with `--clear`** and reload app (or new EAS build).

---

## Code changes (prod naming)

- All locale string **values**: Community / Member / Host / Event / Invite Code
- `INSTITUTION` / `KURUM` section headers → **COMMUNITY** / **TOPLULUK**
- Server API error messages framed (global error handler)
- Notifications & guest dashboard JSON framed on server
- Hardcoded UI components updated
- Prod smoke: `PT-4S9WQ2U6` + `manager@demo.com` OK

---

## Release checklist (do in order)

1. Deploy API to Railway (server copy changes)
2. `eas build --platform ios --profile production` (v1.2.1)
3. ASC **Sign-in**: `manager@demo.com` / `Manager123!`
4. ASC **Notes**: paste `docs/APP_STORE_REVIEW_NOTES.txt`
5. **Resolution Center**: paste `docs/APP_STORE_CONNECT_2_1_ANSWERS.md`
6. Submit build 1.2.1+

---

## “%100 çözdük” means

| Layer | Status |
|-------|--------|
| Product positioning (not medical) | Documented + UI copy |
| Demo login works on prod API | Verified smoke |
| Apple questions answered | Copy-paste ready |
| New binary with new strings | **You must build & submit** |
| 5.1.1(ix) Organization account | **Not required** if answers + positioning hold; if Apple insists on Organization later, that is account-type policy |

We cannot mark App Store “approved” until Apple re-reviews the **new build** and your **Resolution Center reply**.
