import React from "react";
import { View, Text, StyleSheet, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { T, cardShadow } from "@/constants/adminTheme";

export interface DoctorSlide {
  id: string;
  fullName: string;
  specialty?: string | null;
  photoUrl?: string | null;
  university?: string | null;
  experienceYears?: number | null;
  languages?: string | null;
  diplomaUrl?: string | null;
}

function initials(name: string) {
  return name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
}

function parseLanguages(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return raw.split(/[,;]+/).map(s => s.trim()).filter(Boolean);
}

interface Props { doctor: DoctorSlide }

export function DoctorProfileCard({ doctor }: Props) {
  const langs = parseLanguages(doctor.languages);
  const visibleLangs = langs.slice(0, 2);
  const extraLangs   = langs.length > 2 ? langs.length - 2 : 0;

  return (
    <View style={[styles.card, cardShadow]}>
      {/* Avatar */}
      <View style={styles.avatarWrap}>
        {doctor.photoUrl ? (
          <Image source={{ uri: doctor.photoUrl }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarFallback}>
            <Text style={styles.avatarInitials}>{initials(doctor.fullName)}</Text>
          </View>
        )}
        {doctor.diplomaUrl ? (
          <View style={styles.diplomaBadge}>
            <Ionicons name="ribbon-outline" size={10} color="#059669" />
          </View>
        ) : null}
      </View>

      {/* Name */}
      <Text style={styles.name} numberOfLines={2}>{doctor.fullName}</Text>

      {/* Specialty */}
      {doctor.specialty ? (
        <View style={styles.specialtyRow}>
          <Ionicons name="medical-outline" size={11} color={T.accent} />
          <Text style={styles.specialty} numberOfLines={1}>{doctor.specialty}</Text>
        </View>
      ) : null}

      {/* University */}
      {doctor.university ? (
        <View style={styles.infoRow}>
          <Ionicons name="school-outline" size={11} color={T.textMuted} />
          <Text style={styles.infoText} numberOfLines={1}>{doctor.university}</Text>
        </View>
      ) : null}

      {/* Experience */}
      {doctor.experienceYears ? (
        <View style={styles.infoRow}>
          <Ionicons name="time-outline" size={11} color={T.textMuted} />
          <Text style={styles.infoText}>{doctor.experienceYears}+ yrs</Text>
        </View>
      ) : null}

      {/* Languages */}
      {langs.length > 0 ? (
        <View style={styles.langsRow}>
          {visibleLangs.map(l => (
            <View key={l} style={styles.langChip}>
              <Text style={styles.langText}>{l}</Text>
            </View>
          ))}
          {extraLangs > 0 ? (
            <View style={[styles.langChip, styles.langExtra]}>
              <Text style={styles.langText}>+{extraLangs}</Text>
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 160,
    backgroundColor: T.surface,
    borderRadius: 20,
    padding: T.sp16,
    borderWidth: 1,
    borderColor: T.border,
    gap: 6,
  },
  avatarWrap: { alignSelf: "center", marginBottom: 4, position: "relative" },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: T.accent,
  },
  avatarFallback: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(3,105,161,0.12)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(3,105,161,0.2)",
  },
  avatarInitials: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
    color: T.accent,
    letterSpacing: -0.5,
  },
  diplomaBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#D1FAE5",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#fff",
  },
  name: {
    fontFamily: "Inter_700Bold",
    fontSize: 13,
    color: T.text,
    textAlign: "center",
    letterSpacing: -0.2,
  },
  specialtyRow: { flexDirection: "row", alignItems: "center", gap: 4, justifyContent: "center" },
  specialty: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    color: T.accent,
    textAlign: "center",
  },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  infoText: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: T.textSec,
    flex: 1,
  },
  langsRow: { flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 2 },
  langChip: {
    backgroundColor: "rgba(3,105,161,0.08)",
    borderRadius: 20,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  langExtra: { backgroundColor: T.surfaceSubtle },
  langText: { fontFamily: "Inter_500Medium", fontSize: 9, color: T.accent },
});
