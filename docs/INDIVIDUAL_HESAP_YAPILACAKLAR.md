# Individual hesap — yapılacaklar listesi (sırayla)

## Önce bil

- **2.1 (demo giriş):** Kod + prod deploy ile çözülür.
- **5.1.1(ix) (Organization):** Apple Individual ile red verdi. **Tekrar deneme:** hassas belgeleri sil + community positioning + appeal. Yine red gelirse → şirket/transfer veya App Store dışı yollar.

---

## ADIM 1 — Railway (API deploy)

1. Değişiklikleri push edin (main).
2. Railway projesinde deploy bitsin (`server:build` / start komutu).
3. Terminal:

```bash
npm run smoke:api:prod
```

`PT-4S9WQ2U6` ve ikinci cihaz login **200** olmalı.

---

## ADIM 2 — Production veritabanı

Railway → Variables → `DATABASE_URL` kopyalayın. Lokal:

```bash
export DATABASE_URL="postgresql://..."
export ALLOW_PROD_DEMO_SEED=1

npm run db:sanitize:prod-uploads
npm run db:seed:demo-guest
npm run smoke:api:prod
```

---

## ADIM 3 — iOS build 1.2.3

```bash
eas build --platform ios --profile review --non-interactive
# Build ID gelince:
eas submit --platform ios --profile review --id <BUILD_ID> --non-interactive --no-wait
```

TestFlight veya ASC’de **1.2.3** görünene kadar bekleyin.

---

## ADIM 4 — Kendi cihazınızda test

1. **Host:** Host Login → `manager@demo.com` / `Manager123!`
2. **Upload Types:** Visa / Travel Insurance **yok**
3. **Member:** Member Login → `PT-4S9WQ2U6` → hata **olmamalı**

---

## ADIM 5 — Screenshot (5–6 adet)

- Intro (Community & Events)
- Host Login / Dashboard
- Upload Types (Profile Photo, Event Photo)
- Members list
- Member timeline
- **Kullanmayın:** Guest, Institution, Visa, Insurance, Clinic

---

## ADIM 6 — App Store Connect

### Sign-In (zorunlu)

| Alan | Değer |
|------|--------|
| Username | `manager@demo.com` |
| Password | `Manager123!` |

### Review Notes

`docs/APP_STORE_REVIEW_NOTES.txt` içeriğini yapıştırın.

### Metadata

- Primary: **Social Networking**
- Subtitle: `Community & event plans`
- Description: `docs/APP_STORE_CONNECT_FULL_PACK.md` §6

### Yeni sürüm

Build **1.2.3** seç → Submit for Review.

---

## ADIM 7 — Resolution Center cevabı

`docs/APP_STORE_RESOLUTION_CENTER_REPLY.txt` (güncel) → Reply yapıştır.

---

## ADIM 8 — Yine 5.1.1(ix) gelirse

1. [Meet with Apple](https://developer.apple.com/contact/app-store/) — Salı/Perşembe
2. Veya Limited şirket + D-U-N-S → Organization
3. Veya Organization hesabı olan partner → App Transfer

Individual kalırken **garantili** mağaza yolu yok; appeal + ürün sadeleştirme tek şans.
