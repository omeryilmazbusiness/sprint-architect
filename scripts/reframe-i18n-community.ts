/**
 * Reframe only string VALUES in i18n files (never property keys or import paths).
 * Run: npx tsx scripts/reframe-i18n-community.ts
 */
import * as fs from "fs";
import * as path from "path";

const ROOT = path.resolve(__dirname, "..");

const FILES = [
  "i18n/en.ts",
  "i18n/tr.ts",
  "i18n/ru.ts",
  "i18n/es.ts",
  "i18n/bundles/guestDetailCreateGuest.ts",
  "i18n/bundles/guestDetailCreateGuest.tr.ts",
  "i18n/bundles/guestDetailCreateGuest.ru.ts",
  "i18n/bundles/guestDetailCreateGuest.es.ts",
];

const REPLACEMENTS: [string, string][] = [
  ["Guest Access Key", "Invite Code"],
  ["Guest Login", "Member Login"],
  ["Management Login", "Host Login"],
  ["Management", "Host Login"],
  ["INSTITUTIONS", "COMMUNITIES"],
  ["INSTITUTION", "COMMUNITY"],
  ["Institutions", "Communities"],
  ["Institution", "Community"],
  ["institutions", "communities"],
  ["institution", "community"],
  ["KURUM", "TOPLULUK"],
  ["Kurumlar", "Topluluklar"],
  ["Kurum", "Topluluk"],
  ["kurum", "topluluk"],
  ["Misafir", "Üye"],
  ["misafir", "üye"],
  ["INSTITUCIÓN", "COMUNIDAD"],
  ["Institución", "Comunidad"],
  ["institución", "comunidad"],
  ["Invitado", "Miembro"],
  ["ОРГАНИЗАЦИЯ", "СООБЩЕСТВО"],
  ["Организация", "Сообщество"],
  ["Учреждение", "Сообщество"],
  ["Гость", "Участник"],
  ["Providers", "Hosts"],
  ["Provider", "Host"],
  ["All Visits", "All Events"],
  ["Today's Visits", "Today's Events"],
  ["Today's Visit", "Today's Event"],
  ["Next Visit", "Next Event"],
  ["NEXT VISIT", "NEXT EVENT"],
  ["Visit today", "Event today"],
  ["View Visits", "View Events"],
  ["Visit cancelled", "Event cancelled"],
  ["Visit created", "Event created"],
  ["Cancel Visit", "Cancel Event"],
  ["New Visit", "New Event"],
  ["Visit Scheduled", "Event Scheduled"],
  ["Visits", "Events"],
  ["Visit", "Event"],
  ["Approve Guest", "Approve Member"],
  ["Guest approved", "Member approved"],
  ["Guest Status", "Member Status"],
  ["Guest document", "Member upload"],
  ["Guest Information", "Member Information"],
  ["Guest details", "Member details"],
  ["Guest Created", "Member Created"],
  ["New Guest", "New Member"],
  ["All Guests", "All Members"],
  ["Active Guests", "Active Members"],
  ["No guests found", "No members found"],
  ["No guests yet", "No members yet"],
  ["Search guests", "Search members"],
  ["first guest", "first member"],
  ["View guest", "View member"],
  ["the guest", "the member"],
  ["Guest", "Member"],
  ["guests", "members"],
  ["guest", "member"],
  ["Add Provider", "Add Host"],
  ["Exclusive Guest Offerings", "Member Perks"],
];

function reframeQuotedStrings(content: string): string {
  return content.replace(/"([^"\\]|\\.)*"/g, (quoted) => {
    let inner = quoted.slice(1, -1);
    // Never rewrite import paths or module identifiers
    if (
      inner.includes("/bundles/") ||
      inner.includes("/constants/") ||
      inner.startsWith("@/")
    ) {
      return quoted;
    }
    for (const [from, to] of REPLACEMENTS) {
      inner = inner.split(from).join(to);
    }
    return `"${inner}"`;
  });
}

for (const rel of FILES) {
  const file = path.join(ROOT, rel);
  if (!fs.existsSync(file)) {
    console.warn(`skip ${rel}`);
    continue;
  }
  const before = fs.readFileSync(file, "utf8");
  const after = reframeQuotedStrings(before);
  if (before !== after) {
    fs.writeFileSync(file, after);
    console.log(`updated ${rel}`);
  }
}

console.log("done");
