# Individual App Store — prod review plan (1.2.4)

## 1.2.4 uygun mu?

**Evet** — store build `EXPO_PUBLIC_REVIEW_MODE=1`, community i18n, upload types, member login fix, passport UI gizli.  
**Eksik parça:** Production **veritabanı** demo verisi (upload types, Demo Member adı, demo events).

Yeni binary gerekmez; Railway deploy + `prod:ensure:review` yeterli. İsteğe bağlı 1.2.5 sadece küçük client fix varsa.

---

## Apple erişim matrisi

| Rol | ASC Sign-in | Uygulama |
|-----|-------------|----------|
| **Host (tam)** | `manager@demo.com` / `Manager123!` | Host Login → tüm manager tabs |
| **Admin** | (Notes’ta) `admin@demo.com` / `Admin123!` | Admin tab |
| **Member** | (opsiyonel) | Member Login → `PT-4S9WQ2U6` |

---

## Prod adımları (sırayla)

```bash
# 1) Push → Railway auto-deploy

# 2) Prod DB (tek komut)
export DATABASE_URL="<Railway PostgreSQL URL>"
export ALLOW_PROD_DEMO_SEED=1
npm run prod:ensure:review

# 3) Self-test
npm run smoke:review:prod
```

Beklenen: 14+ OK, hassas upload yok, member dashboard temiz.

---

## Hassas veri politikası

- **Tutmuyoruz:** passport, visa, insurance, consent formları (UI + API filtresi)
- **Upload types:** Profile Photo, Event Photo, Group Snapshot only
- **Kategori:** Social Networking
- **5.1.1(ix):** Appeal metni Individual + community (Resolution Center)

---

## ASC (1.2.4 build 8)

- Sign-in: `manager@demo.com` / `Manager123!`
- Notes/Description: `APP_STORE_NOTES_AND_DESCRIPTION_1_2_4.txt`
