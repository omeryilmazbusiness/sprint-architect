import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { T, cardShadow } from "@/constants/adminTheme";

interface Doctor {
  id: string;
  fullName: string;
  specialty?: string;
  phone?: string;
  email?: string;
  university?: string;
  graduationYear?: number;
  experienceYears?: number;
  bio?: string;
  languages?: string;
}

const AVATAR_COLORS = [
  "#0A3D62", "#0369A1", "#059669", "#7C3AED",
  "#D97706", "#0891B2", "#DB2777", "#65A30D",
];

function avatarColor(name: string) {
  return AVATAR_COLORS[name.length % AVATAR_COLORS.length];
}

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase();
}

interface MetaChipProps {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  accent?: boolean;
}

function MetaChip({ icon, label, accent }: MetaChipProps) {
  return (
    <View style={[styles.chip, accent && styles.chipAccent]}>
      <Ionicons name={icon} size={11} color={accent ? T.accent : T.textMuted} />
      <Text style={[styles.chipText, accent && styles.chipTextAccent]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

interface Props {
  doctor: Doctor;
  onEdit: (doctor: Doctor) => void;
  onDelete: (id: string) => void;
}

function DoctorListCard({ doctor, onEdit, onDelete }: Props) {
  const color = avatarColor(doctor.fullName);
  const inits = initials(doctor.fullName);

  function handleDelete() {
    Alert.alert(
      "Remove Doctor",
      `Remove ${doctor.fullName} from your clinic?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Remove", style: "destructive", onPress: () => onDelete(doctor.id) },
      ]
    );
  }

  const chips: MetaChipProps[] = [];
  if (doctor.experienceYears)
    chips.push({ icon: "medal-outline", label: `${doctor.experienceYears} yrs exp`, accent: true });
  if (doctor.phone)
    chips.push({ icon: "call-outline", label: doctor.phone });
  if (doctor.email)
    chips.push({ icon: "mail-outline", label: doctor.email });
  if (doctor.university)
    chips.push({ icon: "school-outline", label: doctor.university });
  if (doctor.languages)
    chips.push({ icon: "language-outline", label: doctor.languages });

  return (
    <Pressable
      onPress={() => onEdit(doctor)}
      style={({ pressed }) => [styles.card, cardShadow, { opacity: pressed ? 0.94 : 1 }]}
    >
      {/* Row 1: Avatar + Name + Actions */}
      <View style={styles.topRow}>
        <View style={[styles.avatar, { backgroundColor: color + "18" }]}>
          <Text style={[styles.avatarText, { color }]}>{inits}</Text>
        </View>

        <View style={styles.nameCol}>
          <Text style={styles.name} numberOfLines={1}>{doctor.fullName}</Text>
          {doctor.specialty ? (
            <Text style={styles.specialty} numberOfLines={1}>{doctor.specialty}</Text>
          ) : (
            <Text style={styles.specialtyMuted}>No specialty</Text>
          )}
        </View>

        <View style={styles.actions}>
          <Pressable
            onPress={() => onEdit(doctor)}
            hitSlop={8}
            style={({ pressed }) => [styles.actionBtn, { opacity: pressed ? 0.6 : 1 }]}
          >
            <Ionicons name="pencil-outline" size={17} color={T.accent} />
          </Pressable>
          <Pressable
            onPress={handleDelete}
            hitSlop={8}
            style={({ pressed }) => [styles.actionBtn, { opacity: pressed ? 0.6 : 1 }]}
          >
            <Ionicons name="trash-outline" size={17} color={T.danger} />
          </Pressable>
        </View>
      </View>

      {/* Row 2: Meta chips */}
      {chips.length > 0 && (
        <View style={styles.chipsRow}>
          {chips.map((c, i) => (
            <MetaChip key={i} icon={c.icon} label={c.label} accent={c.accent} />
          ))}
        </View>
      )}
    </Pressable>
  );
}

export default React.memo(DoctorListCard);

const styles = StyleSheet.create({
  card: {
    backgroundColor: T.surface,
    borderRadius: T.r16,
    borderWidth: 1,
    borderColor: T.border,
    marginHorizontal: T.sp16,
    marginBottom: T.sp12,
    paddingHorizontal: T.sp16,
    paddingVertical: 14,
    gap: 10,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: T.sp12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  avatarText: {
    fontFamily: "Inter_700Bold",
    fontSize: 17,
  },
  nameCol: {
    flex: 1,
    gap: 3,
    minWidth: 0,
  },
  name: {
    fontFamily: "Inter_600SemiBold" as any,
    fontSize: 16,
    color: T.text,
  },
  specialty: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: T.textSec,
  },
  specialtyMuted: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: T.textMuted,
  },
  actions: {
    flexDirection: "row",
    gap: T.sp8,
    alignItems: "center",
    flexShrink: 0,
  },
  actionBtn: {
    width: 34,
    height: 34,
    borderRadius: T.r8,
    backgroundColor: T.surfaceSubtle,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: T.border,
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    paddingLeft: 2,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: T.surfaceSubtle,
    borderWidth: 1,
    borderColor: T.border,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    maxWidth: 180,
  },
  chipAccent: {
    backgroundColor: T.accent + "12",
    borderColor: T.accent + "30",
  },
  chipText: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: T.textMuted,
    flexShrink: 1,
  },
  chipTextAccent: {
    color: T.accent,
    fontFamily: "Inter_500Medium",
  },
});
