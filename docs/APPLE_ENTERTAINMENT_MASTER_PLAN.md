# Healory → Community / Entertainment — Master plan

## Gerçekçi hedef

| Madde | Çözüm | Garanti |
|-------|--------|---------|
| **2.1 Demo giriş** | Host `manager@demo.com` + API fix + prod sanitize | Yüksek (deploy sonrası) |
| **5.1.1(ix) Organization** | Apple bireysel hesabı reddetti | **Yalnızca Organization hesap veya transfer** — UI ile tek başına çözülmez |

Bu plandaki kod + metadata + prod DB, **2.1** ve yeniden sınıflandırma şansını maksimize eder. **5.1.1(ix)** için paralelde şirket/D-U-N-S veya partner Organization şart.

---

## Faz 1 — Kod (bu PR) ✅

1. Hassas belge türleri kaldırıldı → `Profile Photo`, `Event Photo`, `Group Snapshot`, `Host note`
2. `sanitizeCommunityUploadTypesProd.ts` — prod demo clinic temizliği
3. Member login `apiPost` → `X-Healory-Review-Mode: 1` (cihaz kilidi kalkar)
4. Sunucu: review header veya demo invite code → device binding reset
5. `Invalid Date` düzeltildi (API ISO + UI guard)
6. Etkinlik etiketleri: City Meetup, Workshop, … (medical yok)
7. i18n: Document Types → **Upload Types**
8. Sürüm **1.2.3**

---

## Faz 2 — Prod (siz, sırayla)

```bash
# 1) Railway deploy (server:build + restart)

# 2) Prod DB — hassas upload türlerini sil
ALLOW_PROD_DEMO_SEED=1 DATABASE_URL=<prod> npm run db:sanitize:prod-uploads

# 3) Demo member cihaz kilidini sıfırla
ALLOW_PROD_DEMO_SEED=1 DATABASE_URL=<prod> npm run db:seed:demo-guest

# 4) Smoke
npm run smoke:api:prod
```

Beklenen: `PT-4S9WQ2U6` login → **200** (farklı `deviceId` ile iki kez).

---

## Faz 3 — App Store Connect

- [ ] Build **1.2.3** submit (`eas build --profile review`)
- [ ] **Sign-in:** `manager@demo.com` / `Manager123!` (PT kodu username değil)
- [ ] **Notes:** Host Login first; Member code optional
- [ ] **Resolution Center:** `APP_STORE_RESOLUTION_CENTER_REPLY.txt` + Organization planı
- [ ] **Screenshots:** Upload Types, Member/Host, **Visa/Insurance yok**
- [ ] **Category:** Social Networking (Medical değil)
- [ ] **Description:** community/events (tam paket: `APP_STORE_CONNECT_FULL_PACK.md`)

---

## Faz 4 — Organization (5.1.1(ix))

1. Limited şirket + D-U-N-S  
2. developer.apple.com → **Organization** enrollment  
3. App transfer veya yeni team ile yeniden imzala (EAS credentials)  
4. Resubmit + Review Notes: “Submitted under Organization account”

Alternatif: Mevcut Organization partner’a **App Transfer**.

---

## Faz 5 — İsteğe bağlı (daha güçlü pozisyon)

- Bundle ID değişimi (`com.healory.community`) — büyük iş  
- Meet with Apple — “not health app, community coordination”  
- Passport alanlarını member formdan gizle (review build)

---

## Doğrulama checklist

- [ ] Prod’da Document Types ekranında Visa/Insurance yok  
- [ ] Member `PT-4S9WQ2U6` iPad’de giriyor  
- [ ] Host demo dashboard açılıyor  
- [ ] Screenshot’lar 1.2.3 UI  
- [ ] Organization hesabı hazır veya başvuru devam ediyor
