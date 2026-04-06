import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { T } from "@/constants/adminTheme";
import { useT } from "@/hooks/useT";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DoctorCardItem {
  id: string;
  fullName: string;
  specialty?: string | null;
  photoUrl?: string | null;
  university?: string | null;
  experienceYears?: number | null;
  languages?: string | null;
  diplomaUrl?: string | null;
  bio?: string | null;
}

interface Props {
  doctor: DoctorCardItem | null;
  isAppointmentDoctor: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function initials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function parseLangs(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(/[,;]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

// ─── Stats panel ──────────────────────────────────────────────────────────────

interface StatsPanelProps {
  experienceYears: number | null | undefined;
  university: string | null | undefined;
  langCount: number;
}

function StatsPanel({ experienceYears, university, langCount }: StatsPanelProps) {
  const t = useT();
  const tg = t.guestDashboard;

  const cols: { label: string; value: string }[] = [];
  if (experienceYears) cols.push({ label: tg.doctorExpLabel, value: tg.doctorExpYrs.replace("{n}", String(experienceYears)) });
  if (university)      cols.push({ label: tg.doctorEduLabel, value: university });
  if (langCount > 0)   cols.push({ label: tg.doctorLangLabel, value: tg.doctorLangSpoken.replace("{n}", String(langCount)) });
  if (cols.length === 0) return null;

  return (
    <View style={s.statsRow}>
      {cols.map((c, i) => (
        <React.Fragment key={c.label}>
          <View style={s.statsCol}>
            <Text style={s.statsVal} numberOfLines={1}>{c.value}</Text>
            <Text style={s.statsLbl}>{c.label}</Text>
          </View>
          {i < cols.length - 1 ? <View style={s.statsDivider} /> : null}
        </React.Fragment>
      ))}
    </View>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyDoctorCard() {
  const t = useT();
  const tg = t.guestDashboard;

  return (
    <LinearGradient
      colors={["#FFFFFF", "#F0F7FF"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[s.card, s.cardEmpty]}
    >
      <View style={s.arcEmpty} />
      <View style={s.header}>
        <View style={s.chipRow}>
          <Ionicons name="person-outline" size={12} color={T.accent} />
          <Text style={s.chip}>{tg.doctorChip}</Text>
        </View>
      </View>
      <View style={s.emptyBody}>
        <View style={s.emptyIconWrap}>
          <Ionicons name="person-outline" size={34} color={T.border} />
        </View>
        <Text style={s.emptyTitle}>{tg.doctorEmpty}</Text>
        <Text style={s.emptySub}>{tg.doctorEmptySub}</Text>
      </View>
    </LinearGradient>
  );
}

// ─── Doctor card (populated) ──────────────────────────────────────────────────

function DoctorCardContent({
  doctor,
  isAppointmentDoctor,
}: Props & { doctor: DoctorCardItem }) {
  const t = useT();
  const tg = t.guestDashboard;
  const langs = parseLangs(doctor.languages);
  const visLangs = langs.slice(0, 6);
  const extraLangs = langs.length > 6 ? langs.length - 6 : 0;

  return (
    <LinearGradient
      colors={["#FFFFFF", "#EFF6FF"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={s.card}
    >
      {/* Decorative arc */}
      <View style={s.arc} />

      {/* Card header: category chip + appointment/certified badge */}
      <View style={s.header}>
        <View style={s.chipRow}>
          <Ionicons name="medical-outline" size={12} color={T.accent} />
          <Text style={s.chip}>{tg.doctorChip}</Text>
        </View>

        {isAppointmentDoctor ? (
          <View style={s.apptBadge}>
            <Ionicons name="calendar-outline" size={11} color={T.accent} />
            <Text style={s.apptBadgeText}>{tg.doctorYourAppt}</Text>
          </View>
        ) : doctor.diplomaUrl ? (
          <View style={s.certBadge}>
            <Ionicons name="ribbon-outline" size={11} color="#059669" />
            <Text style={s.certText}>{tg.doctorCertified}</Text>
          </View>
        ) : null}
      </View>

      {/* Hero row: avatar + name + specialty */}
      <View style={s.heroRow}>
        {doctor.photoUrl ? (
          <Image source={{ uri: doctor.photoUrl }} style={s.avatar} />
        ) : (
          <View style={s.avatarFallback}>
            <Text style={s.avatarInitials}>{initials(doctor.fullName)}</Text>
          </View>
        )}

        <View style={s.heroInfo}>
          <Text style={s.name} numberOfLines={2}>{doctor.fullName}</Text>
          {doctor.specialty ? (
            <Text style={s.specialty} numberOfLines={2}>{doctor.specialty}</Text>
          ) : null}
          {isAppointmentDoctor && doctor.diplomaUrl ? (
            <View style={s.certBadgeInline}>
              <Ionicons name="ribbon-outline" size={10} color="#059669" />
              <Text style={s.certTextSmall}>{tg.doctorCertified}</Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* Stats panel */}
      <StatsPanel
        experienceYears={doctor.experienceYears}
        university={doctor.university}
        langCount={langs.length}
      />

      {/* Bio quote */}
      {doctor.bio ? (
        <View style={s.bioWrap}>
          <View style={s.bioBar} />
          <Text style={s.bioText} numberOfLines={3}>{doctor.bio}</Text>
        </View>
      ) : null}

      {/* Languages chips */}
      {langs.length > 0 ? (
        <View style={s.langsSection}>
          <Text style={s.langsLabel}>{tg.doctorLangLabel}</Text>
          <View style={s.langsRow}>
            {visLangs.map((l) => (
              <View key={l} style={s.langChip}>
                <Text style={s.langText}>{l}</Text>
              </View>
            ))}
            {extraLangs > 0 ? (
              <View style={[s.langChip, s.langChipMuted]}>
                <Text style={[s.langText, s.langTextMuted]}>+{extraLangs}</Text>
              </View>
            ) : null}
          </View>
        </View>
      ) : null}
    </LinearGradient>
  );
}

// ─── Public export ────────────────────────────────────────────────────────────

export function GuestDoctorCard({ doctor, isAppointmentDoctor }: Props) {
  if (!doctor) return <EmptyDoctorCard />;
  return <DoctorCardContent doctor={doctor} isAppointmentDoctor={isAppointmentDoctor} />;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const AVATAR_SIZE = 80;

const s = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: T.sp16,
    gap: 14,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 3,
  },
  cardEmpty: {
    minHeight: 180,
  },
  arc: {
    position: "absolute",
    top: -50,
    right: -50,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(3,105,161,0.07)",
  },
  arcEmpty: {
    position: "absolute",
    top: -50,
    right: -50,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(3,105,161,0.05)",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  chipRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  chip: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    color: T.accent,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  apptBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#DBEAFE",
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  apptBadgeText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
    color: T.accent,
  },
  certBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#D1FAE5",
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  certText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
    color: "#059669",
  },
  certBadgeInline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    alignSelf: "flex-start",
    backgroundColor: "#D1FAE5",
    borderRadius: 20,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  certTextSmall: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 9,
    color: "#059669",
  },
  heroRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    borderWidth: 3,
    borderColor: T.accent,
    flexShrink: 0,
  },
  avatarFallback: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: "rgba(3,105,161,0.1)",
    borderWidth: 3,
    borderColor: "rgba(3,105,161,0.22)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  avatarInitials: {
    fontFamily: "Inter_700Bold",
    fontSize: 26,
    color: T.accent,
    letterSpacing: -0.5,
  },
  heroInfo: {
    flex: 1,
    gap: 5,
    paddingTop: 4,
  },
  name: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    color: T.text,
    letterSpacing: -0.3,
    lineHeight: 23,
  },
  specialty: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: T.accent,
    lineHeight: 18,
  },
  statsRow: {
    flexDirection: "row",
    backgroundColor: "rgba(3,105,161,0.06)",
    borderRadius: T.r12,
    padding: T.sp12,
    alignItems: "center",
  },
  statsCol: {
    flex: 1,
    alignItems: "center",
    gap: 3,
  },
  statsVal: {
    fontFamily: "Inter_700Bold",
    fontSize: 13,
    color: T.text,
    textAlign: "center",
  },
  statsLbl: {
    fontFamily: "Inter_400Regular",
    fontSize: 10,
    color: T.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  statsDivider: {
    width: 1,
    height: 30,
    backgroundColor: "rgba(3,105,161,0.15)",
  },
  bioWrap: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
  },
  bioBar: {
    width: 3,
    borderRadius: 2,
    backgroundColor: T.accent,
    opacity: 0.35,
    alignSelf: "stretch",
    flexShrink: 0,
  },
  bioText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: T.textSec,
    lineHeight: 20,
    flex: 1,
    fontStyle: "italic",
  },
  langsSection: {
    gap: 8,
  },
  langsLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
    color: T.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  langsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  langChip: {
    backgroundColor: "rgba(3,105,161,0.09)",
    borderRadius: 20,
    paddingHorizontal: 11,
    paddingVertical: 5,
  },
  langChipMuted: {
    backgroundColor: "rgba(0,0,0,0.04)",
  },
  langText: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    color: T.accent,
  },
  langTextMuted: {
    color: T.textMuted,
  },
  emptyBody: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: T.sp16,
    gap: T.sp8,
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(3,105,161,0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: T.textMuted,
    textAlign: "center",
  },
  emptySub: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: T.textMuted,
    textAlign: "center",
    lineHeight: 18,
    maxWidth: 260,
  },
});
