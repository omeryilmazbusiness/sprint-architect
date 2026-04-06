import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  Pressable,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { T, cardShadow } from "@/constants/adminTheme";

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
  phone?: string | null;
  email?: string | null;
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

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyDoctorCard() {
  return (
    <View style={[s.card, s.emptyCard, cardShadow]}>
      <View style={s.emptyIconWrap}>
        <Ionicons name="person-outline" size={28} color={T.textMuted} />
      </View>
      <View style={s.emptyText}>
        <Text style={s.emptyTitle}>Doctor details will appear here</Text>
        <Text style={s.emptySub}>
          Once a doctor is assigned to your appointment, their full profile
          will be shown.
        </Text>
      </View>
    </View>
  );
}

// ─── Doctor card ──────────────────────────────────────────────────────────────

function DoctorCardContent({ doctor, isAppointmentDoctor }: Props & { doctor: DoctorCardItem }) {
  const langs = parseLangs(doctor.languages);
  const visLangs = langs.slice(0, 5);
  const extraLangs = langs.length > 5 ? langs.length - 5 : 0;
  const hasPhone = !!doctor.phone;
  const hasEmail = !!doctor.email;
  const hasContact = hasPhone || hasEmail;

  return (
    <View style={[s.card, cardShadow]}>
      {/* ── Appointment context banner ── */}
      {isAppointmentDoctor ? (
        <View style={s.apptBanner}>
          <Ionicons name="calendar-outline" size={13} color={T.accent} />
          <Text style={s.apptBannerText}>Your upcoming appointment doctor</Text>
        </View>
      ) : null}

      {/* ── Hero row: avatar + name + specialty ── */}
      <View style={s.heroRow}>
        {doctor.photoUrl ? (
          <Image source={{ uri: doctor.photoUrl }} style={s.avatar} />
        ) : (
          <View style={s.avatarFallback}>
            <Text style={s.avatarInitials}>{initials(doctor.fullName)}</Text>
          </View>
        )}

        <View style={s.heroInfo}>
          <Text style={s.name} numberOfLines={2}>
            {doctor.fullName}
          </Text>
          {doctor.specialty ? (
            <View style={s.specialtyRow}>
              <Ionicons name="medical-outline" size={12} color={T.accent} />
              <Text style={s.specialty} numberOfLines={1}>
                {doctor.specialty}
              </Text>
            </View>
          ) : null}
          {doctor.diplomaUrl ? (
            <View style={s.certBadge}>
              <Ionicons name="ribbon-outline" size={11} color="#059669" />
              <Text style={s.certText}>Certified</Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* ── Meta: university + experience ── */}
      {(doctor.university || doctor.experienceYears) ? (
        <View style={s.metaSection}>
          {doctor.university ? (
            <View style={s.metaRow}>
              <View style={s.metaIconWrap}>
                <Ionicons name="school-outline" size={14} color={T.textMuted} />
              </View>
              <Text style={s.metaText} numberOfLines={1}>
                {doctor.university}
              </Text>
            </View>
          ) : null}
          {doctor.experienceYears ? (
            <View style={s.metaRow}>
              <View style={s.metaIconWrap}>
                <Ionicons name="time-outline" size={14} color={T.textMuted} />
              </View>
              <Text style={s.metaText}>
                {doctor.experienceYears}+ years of experience
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}

      {/* ── Bio ── */}
      {doctor.bio ? (
        <Text style={s.bio} numberOfLines={3}>
          {doctor.bio}
        </Text>
      ) : null}

      {/* ── Languages ── */}
      {langs.length > 0 ? (
        <View style={s.langsSection}>
          <Text style={s.langsLabel}>Languages</Text>
          <View style={s.langsRow}>
            {visLangs.map((l) => (
              <View key={l} style={s.langChip}>
                <Text style={s.langText}>{l}</Text>
              </View>
            ))}
            {extraLangs > 0 ? (
              <View style={[s.langChip, s.langChipExtra]}>
                <Text style={s.langText}>+{extraLangs}</Text>
              </View>
            ) : null}
          </View>
        </View>
      ) : null}

      {/* ── Contact ── */}
      {hasContact ? (
        <View style={s.contactRow}>
          {hasPhone ? (
            <Pressable
              style={({ pressed }) => [s.contactBtn, { opacity: pressed ? 0.75 : 1 }]}
              onPress={() => Linking.openURL(`tel:${doctor.phone}`)}
              accessibilityRole="button"
              accessibilityLabel="Call doctor"
            >
              <Ionicons name="call-outline" size={14} color={T.accent} />
              <Text style={s.contactBtnText}>Call</Text>
            </Pressable>
          ) : null}
          {hasEmail ? (
            <Pressable
              style={({ pressed }) => [s.contactBtn, { opacity: pressed ? 0.75 : 1 }]}
              onPress={() => Linking.openURL(`mailto:${doctor.email}`)}
              accessibilityRole="button"
              accessibilityLabel="Email doctor"
            >
              <Ionicons name="mail-outline" size={14} color={T.accent} />
              <Text style={s.contactBtnText}>Email</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

// ─── Public export ────────────────────────────────────────────────────────────

export function GuestDoctorCard({ doctor, isAppointmentDoctor }: Props) {
  if (!doctor) return <EmptyDoctorCard />;
  return <DoctorCardContent doctor={doctor} isAppointmentDoctor={isAppointmentDoctor} />;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  card: {
    backgroundColor: T.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: T.border,
    padding: T.sp20,
    gap: 14,
  },

  // Appointment banner
  apptBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#EFF6FF",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
    alignSelf: "flex-start",
  },
  apptBannerText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    color: T.accent,
  },

  // Hero
  heroRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 16,
  },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 2.5,
    borderColor: T.accent,
    flexShrink: 0,
  },
  avatarFallback: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "rgba(3,105,161,0.09)",
    borderWidth: 2.5,
    borderColor: "rgba(3,105,161,0.18)",
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
    gap: 6,
    paddingTop: 2,
  },
  name: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    color: T.text,
    letterSpacing: -0.3,
    lineHeight: 23,
  },
  specialtyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  specialty: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: T.accent,
    flex: 1,
  },
  certBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    backgroundColor: "#D1FAE5",
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  certText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
    color: "#059669",
  },

  // Meta
  metaSection: {
    gap: 6,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  metaIconWrap: {
    width: 22,
    alignItems: "center",
    flexShrink: 0,
  },
  metaText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: T.textSec,
    flex: 1,
  },

  // Bio
  bio: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: T.textSec,
    lineHeight: 20,
    fontStyle: "italic",
  },

  // Languages
  langsSection: {
    gap: 8,
  },
  langsLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
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
    backgroundColor: "rgba(3,105,161,0.08)",
    borderRadius: 20,
    paddingHorizontal: 11,
    paddingVertical: 4,
  },
  langChipExtra: {
    backgroundColor: T.surfaceSubtle,
  },
  langText: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    color: T.accent,
  },

  // Contact
  contactRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 2,
  },
  contactBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "rgba(3,105,161,0.07)",
    borderRadius: 10,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "rgba(3,105,161,0.14)",
  },
  contactBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: T.accent,
  },

  // Empty state
  emptyCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    borderStyle: "dashed",
  },
  emptyIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: T.surfaceSubtle,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  emptyText: {
    flex: 1,
    gap: 4,
  },
  emptyTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: T.text,
  },
  emptySub: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: T.textMuted,
    lineHeight: 18,
  },
});
