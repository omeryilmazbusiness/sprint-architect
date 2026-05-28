/**
 * Applies neutral terminology to tr.ts, es.ts, ru.ts (string VALUES only).
 * i18n object KEYS must stay as in types.ts (e.g. tabDoctors, doctorChip — never tabProveedors).
 * Run: node scripts/neutralize-i18n-locales.mjs
 * After running, fix any grammar glitches and re-run typecheck:app.
 */
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const i18nDir = path.join(root, "i18n");

/** Longest-first replacements per locale. */
const LOCALE_REPLACEMENTS = {
  tr: [
    ["Kullanıcılar ve Hastalar", "Kullanıcılar ve Üyeler"],
    ["Hasta Kayıtları", "Üye Kayıtları"],
    ["Hasta Başı Birim Fiyat", "Üye Başı Birim Fiyat"],
    ["hasta yüklemesi bekleniyor", "üye yüklemesi bekleniyor"],
    ["Tüm hastaların erişimini", "Tüm üyelerin erişimini"],
    ["yöneticiler ve hastalar", "yöneticiler ve üyeler"],
    ["Hastalar", "Üyeler"],
    ["hastalar", "üyeler"],
    ["hasta kayıtları", "üye kayıtları"],
    ["hasta", "üye"],
    ["Hasta", "Üye"],
    ["Doktorlar", "Sağlayıcılar"],
    ["Doktoru", "Sağlayıcısı"],
    ["Doktorunuz", "Sağlayıcınız"],
    ["doktorun", "sağlayıcının"],
    ["doktorlar", "sağlayıcılar"],
    ["doktor", "sağlayıcı"],
    ["Doktor", "Sağlayıcı"],
    ["randevular", "ziyaretler"],
    ["randevu", "ziyaret"],
    ["Randevu", "Ziyaret"],
    ["Tedavi", "Hizmet"],
    ["tedavi", "hizmet"],
    ["Klinikler", "Organizasyonlar"],
    ["Kliniği", "Organizasyonu"],
    ["Kliniğe", "Organizasyona"],
    ["kliniğinizi", "organizasyonunuzu"],
    ["kliniğin", "organizasyonun"],
    ["kliniği", "organizasyonu"],
    ["Klinik", "Organizasyon"],
    ["klinik", "organizasyon"],
    ["KLİNİK", "ORGANİZASYON"],
    ["İstanbul Tıp Merkezi", "İstanbul Operasyon Merkezi"],
    ["fatura@klinik.com", "fatura@ornek.com"],
    ["Tıbbi", "Operasyonel"],
    ["tıbbi", "operasyonel"],
    ["Medikal", "Operasyonel"],
    ["Tıp Okulu", "Üniversite"],
    ["planlanmış randevular", "planlanmış ziyaretler"],
    ["cilt bakım planları", "bakım planları"],
  ],
  es: [
    ["Usuarios y Pacientes", "Usuarios y Miembros"],
    ["Registros de Pacientes", "Registros de Miembros"],
    ["Precio Unitario por Paciente", "Precio Unitario por Miembro"],
    ["esperando carga del paciente", "esperando carga del miembro"],
    ["Restaurar el acceso de todos los pacientes", "Restaurar el acceso de todos los miembros"],
    ["gestores y pacientes", "gestores y miembros"],
    ["Pacientes", "Miembros"],
    ["pacientes", "miembros"],
    ["paciente", "miembro"],
    ["Paciente", "Miembro"],
    ["Médicos", "Proveedores"],
    ["Médico", "Proveedor"],
    ["médico", "proveedor"],
    ["Doctores", "Proveedores"],
    ["Doctor", "Proveedor"],
    ["doctor", "proveedor"],
    ["citas programadas", "visitas programadas"],
    ["citas", "visitas"],
    ["cita", "visita"],
    ["Cita", "Visita"],
    ["Tratamiento", "Servicio"],
    ["tratamiento", "servicio"],
    ["Clínicas", "Organizaciones"],
    ["Clínica", "Organización"],
    ["clínica", "organización"],
    ["CLÍNICA", "ORGANIZACIÓN"],
    ["Centro Médico", "Centro de Operaciones"],
    ["facturacion@clinica.com", "facturacion@ejemplo.com"],
    ["personal médico", "personal especializado"],
    ["Informe Médico", "Documento de identidad"],
    ["Escuela de Medicina", "Universidad"],
    ["planes de atención", "planes de servicio"],
  ],
  ru: [
    ["Пользователи и пациенты", "Пользователи и участники"],
    ["Записи пациентов", "Записи участников"],
    ["Цена за пациента", "Цена за участника"],
    ["ожидают загрузки", "ожидают загрузки участником"],
    ["Восстановит доступ всех пациентов", "Восстановит доступ всех участников"],
    ["Менеджеры и пациенты", "Менеджеры и участники"],
    ["Пациенты", "Участники"],
    ["пациентов", "участников"],
    ["пациента", "участника"],
    ["пациент", "участник"],
    ["Пациент", "Участник"],
    ["Врачи", "Специалисты"],
    ["Врач", "Специалист"],
    ["врач", "специалист"],
    ["врачей", "специалистов"],
    ["приёмы", "визиты"],
    ["приём", "визит"],
    ["Приём", "Визит"],
    ["запланированные приёмы", "запланированные визиты"],
    ["Лечение", "Услуга"],
    ["лечение", "услуга"],
    ["Клиники", "Организации"],
    ["Клиника", "Организация"],
    ["клинику", "организацию"],
    ["клиники", "организации"],
    ["клиник", "организаций"],
    ["клинике", "организации"],
    ["КЛИНИКА", "ОРГАНИЗАЦИЯ"],
    ["медицинский центр", "операционный центр"],
    ["billing@clinic.com", "billing@example.com"],
    ["медицинской", "операционной"],
    ["Медицинский", "Операционный"],
  ],
};

function applyReplacements(content, pairs) {
  let out = content;
  for (const [from, to] of pairs) {
    out = out.split(from).join(to);
  }
  return out;
}

for (const [locale, pairs] of Object.entries(LOCALE_REPLACEMENTS)) {
  const file = path.join(i18nDir, `${locale}.ts`);
  const before = fs.readFileSync(file, "utf8");
  const after = applyReplacements(before, pairs);
  fs.writeFileSync(file, after, "utf8");
  console.log(`Updated ${locale}.ts`);
}

console.log("Done.");
