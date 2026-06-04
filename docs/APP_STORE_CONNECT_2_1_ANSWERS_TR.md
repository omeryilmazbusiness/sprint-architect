# App Store Connect — Resolution Center (Türkçe özet + İngilizce tam metin)

**İngilizce resmi cevap için:** `APP_STORE_CONNECT_2_1_ANSWERS.md` dosyasının tamamını yapıştırın.  
**Review Notes:** `APP_STORE_REVIEW_NOTES.txt`

---

## Apple ne istiyor? (kısa)

1. Uygulama **düzenlenmiş sağlık hizmeti sunmuyor** — topluluk/etkinlik koordinasyonu.
2. **Omer Yilmaz** sadece geliştirici; klinik/sağlayıcı değil.
3. **Guest** = davet kodlu **üye (Member)**.
4. Hedef: etkinlik/topluluk organizatörleri.
5. `PT-4S9WQ2U6` **şifre değil** — **Member Login** → Invite Code.

---

## ASC Sign-In (zorunlu)

| Alan | Değer |
|------|--------|
| Kullanıcı adı | `manager@demo.com` |
| Şifre | `Manager123!` |

**Not alanına yazın:**
```
Member demo: Member Login sekmesi → invite code PT-4S9WQ2U6 (şifre değil).
Host demo: Host Login → manager@demo.com / Manager123!
```

---

## Soru 1 — Hangi kurumlar hizmet veriyor?

**Cevap (TR):** Uygulama üzerinden hiçbir kurum düzenlenmiş (tıbbi vb.) hizmet sunmaz. Healory, bağımsız toplulukların etkinlik takvimi, zaman çizelgesi ve üyelerin yüklediği medya/dosyaları paylaşması için bir koordinasyon aracıdır. Teşhis, tedavi veya reçete sunulmaz.

---

## Soru 2 — Omer Yilmaz’ın sağlayıcılarla ilişkisi?

**Cevap (TR):** Omer Yilmaz yalnızca uygulamanın bireysel geliştiricisi ve yayıncısıdır. Uygulama üzerinden sağlık veya başka düzenlenmiş hizmet sağlamaz; listedeki topluluklar bağımsız çalışır.

---

## Soru 3 — Guest hesapları kimler?

**Cevap (TR):** “Guest” rolü artık arayüzde **Member (Üye)** olarak geçer. Topluluk host’unun verdiği **davet kodu (Invite Code)** ile giriş yapan katılımcılardır. Etkinliklerini görür, istenen yüklemeleri yapar; topluluk yönetemezler.

---

## Soru 4 — Hangi organizasyon türleri?

**Cevap (TR):** Çok lokasyonlu ekipler, etkinlik organizatörleri, topluluk grupları, retreat/gezi toplulukları gibi koordineli deneyimler yürüten yapılar. Sosyal/etkinlik odaklıdır; hastane veya klinik yazılımı değildir.

---

## Soru 5 — Demo giriş

| Rol | Nasıl |
|-----|------|
| Host | Host Login → `manager@demo.com` / `Manager123!` |
| Üye | Member Login → `PT-4S9WQ2U6` |
| Admin (gerekirse) | `admin@demo.com` / `Admin123!` |

Prod API’de her iki yol da test edildi (smoke 7/7).

---

## UI’da yapılan son düzeltmeler (sizin bildirdiğiniz)

- Dashboard header altı: API’den gelen topluluk adı `frameDisplayText` + `ManagerHeader` ile **Institution → Community**
- Alt sekme (footer): **Services → Experiences** (`managerTabLabels.services`)
- Ayarlar satırı: **Experiences** / Experience Tags

Yeni binary (1.2.1+) göndermeden Apple eski metinleri görür.
