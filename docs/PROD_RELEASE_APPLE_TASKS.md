# Prod release — Apple 2.1 / community framing (checklist)

## Apple soruları → cevaplar

| Apple sorusu | Cevap özeti | Doküman |
|--------------|-------------|---------|
| Hangi kurumlar hizmet veriyor? | **Hiçbiri** — uygulama düzenlenmiş hizmet sunmaz; topluluk/etkinlik koordinasyon aracıdır | `APP_STORE_CONNECT_2_1_ANSWERS.md` |
| Omer Yilmaz ile ilişki? | Yalnızca **geliştirici/yayıncı**; sağlayıcı değil | aynı |
| Guest hesapları kim? | **Member** — davet kodu ile topluluğa katılan katılımcılar | aynı |
| Hangi organizasyonlar? | Etkinlik/topluluk organizatörleri (eğlence/sosyal koordinasyon) | aynı |
| PT-4S9WQ2U6 giriş olmadı | Bu **şifre değil** — **Member Login** sekmesinde **Invite Code** | Review Notes aşağı |

## ASC’de yapılacaklar (manuel)

- [ ] **Resolution Center** → `docs/APP_STORE_CONNECT_2_1_ANSWERS.md` tam metin yapıştır
- [ ] **App Review Information → Sign-in**
  - Username: `manager@demo.com`
  - Password: `Manager123!`
- [ ] **Notes:** Member flow: open app → **Member Login** tab → invite code `PT-4S9WQ2U6` (not username field on Host tab)
- [ ] Primary category: **Social Networking** veya **Entertainment**
- [ ] Build: `eas build --platform ios --profile production` (community copy in binary)
- [ ] Prod API deploy + demo seed doğrula

## Kod görevleri (bu PR)

1. [x] Base i18n reframe (EN + bundles + TR/RU/ES script)
2. [x] `terminology.ts` — varsayılan community terimleri
3. [x] Intro — community copy
4. [x] EAS production `EXPO_PUBLIC_REVIEW_MODE=1` + API framing header
5. [ ] Prod DB: Demo Community + `PT-4S9WQ2U6` aktif
6. [ ] `npm run smoke:api:prod`
7. [ ] Version bump + EAS build submit

## İsimlendirme sözlüğü (prod UI)

| Eski | Yeni |
|------|------|
| Institution | Community |
| Guest | Member |
| Guest Access Key | Invite Code |
| Provider / Doctor | Host |
| Visit / Appointment | Event |
| Management | Host (login) |
| Plan / Journey | Timeline |
