import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { T, cardShadow } from "@/constants/adminTheme";

export interface Doctor {
  id: string;
  clinicId?: string;
  fullName: string;
  specialty?: string | null;
  phone?: string | null;
  email?: string | null;
  photoUrl?: string | null;
  university?: string | null;
  graduationYear?: number | null;
  experienceYears?: number | null;
  bio?: string | null;
  languages?: string | null;
  certifications?: string | null;
  diplomaUrl?: string | null;
  createdAt?: string | null;
}

const AVATAR_PALETTE = [
  "#0A3D62", "#0369A1", "#059669", "#7C3AED",
  "#D97706", "#0891B2", "#DB2777", "#65A30D",
  "#EA580C", "#0F766E",
];

function avatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
}

function initials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase();
}

interface TagProps {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  variant?: "default" | "accent" | "success";
}

const Tag = React.memo(function Tag({ icon, label, variant = "default" }: TagProps) {
  const tagStyle =
    variant === "accent" ? [styles.tag, styles.tagAccent]
    : variant === "success" ? [styles.tag, styles.tagSuccess]
    : styles.tag;
  const textStyle =
    variant === "accent" ? [styles.tagText, styles.tagTextAccent]
    : variant === "success" ? [styles.tagText, styles.tagTextSuccess]
    : styles.tagText;
  const iconColor =
    variant === "accent" ? T.accent
    : variant === "success" ? T.success
    : T.textMuted;
  return (
    <View style={tagStyle}>
      <Ionicons name={icon} size={11} color={iconColor} />
      <Text style={textStyle} numberOfLines={1}>{label}</Text>
    </View>
  );
});

interface Props {
  doctor: Doctor;
  onEdit: (doctor: Doctor) => void;
  onDelete: (id: string) => void;
}

function DoctorListCard({ doctor, onEdit, onDelete }: Props) {
  const color = avatarColor(doctor.fullName);
  const inits = initials(doctor.fullName);
  const [confirming, setConfirming] = useState(false);

  const tags: TagProps[] = [];
  if (doctor.experienceYears)
    tags.push({ icon: "medal-outline", label: `${doctor.experienceYears} yrs exp`, variant: "accent" });
  if (doctor.university)
    tags.push({ icon: "school-outline", label: doctor.university });
  if (doctor.phone)
    tags.push({ icon: "call-outline", label: doctor.phone });
  if (doctor.email)
    tags.push({ icon: "mail-outline", label: doctor.email });
  if (doctor.languages)
    tags.push({ icon: "language-outline", label: doctor.languages });
  if (doctor.diplomaUrl)
    tags.push({ icon: "ribbon-outline", label: "Diploma verified", variant: "success" });

  return (
    <Pressable
      onPress={() => !confirming && onEdit(doctor)}
      style={({ pressed }) => [styles.card, cardShadow, pressed && !confirming && styles.cardPressed]}
    >
      <View style={styles.topRow}>
        <View style={[styles.avatar, { backgroundColor: color + "18", borderColor: color + "30" }]}>
          <Text style={[styles.avatarText, { color }]}>{inits}</Text>
        </View>

        <View style={styles.nameCol}>
          <Text style={styles.name} numberOfLines={1}>{doctor.fullName}</Text>
          <Text
            style={doctor.specialty ? styles.specialty : styles.specialtyMuted}
            numberOfLines={1}
          >
            {doctor.specialty ?? "General practice"}
          </Text>
        </View>

        <View style={styles.actions}>
          <Pressable
            onPress={() => { setConfirming(false); onEdit(doctor); }}
            hitSlop={10}
            style={({ pressed }) => [styles.actionBtn, styles.editBtn, pressed && { opacity: 0.6 }]}
            testID={`edit-doctor-${doctor.id}`}
          >
            <Ionicons name="pencil-outline" size={16} color={T.accent} />
          </Pressable>
          <Pressable
            onPress={() => setConfirming(true)}
            hitSlop={10}
            style={({ pressed }) => [
              styles.actionBtn,
              confirming ? styles.deleteBtnActive : styles.deleteBtn,
              pressed && { opacity: 0.6 },
            ]}
            testID={`delete-doctor-${doctor.id}`}
          >
            <Ionicons name="trash-outline" size={16} color={confirming ? "#fff" : T.danger} />
          </Pressable>
        </View>
      </View>

      {tags.length > 0 && (
        <View style={styles.tagsRow}>
          {tags.slice(0, 5).map((t, i) => (
            <Tag key={i} icon={t.icon} label={t.label} variant={t.variant} />
          ))}
        </View>
      )}

      {doctor.bio ? (
        <Text style={styles.bio} numberOfLines={2}>{doctor.bio}</Text>
      ) : null}

      {confirming && (
        <View style={styles.confirmBar} testID="confirm-delete-bar">
          <Text style={styles.confirmText}>Remove this doctor?</Text>
          <Pressable
            onPress={() => setConfirming(false)}
            style={[styles.confirmBtn, styles.confirmBtnCancel]}
            testID="confirm-cancel"
          >
            <Text style={styles.confirmBtnCancelText}>Cancel</Text>
          </Pressable>
          <Pressable
            onPress={() => { setConfirming(false); onDelete(doctor.id); }}
            style={[styles.confirmBtn, styles.confirmBtnDelete]}
            testID="confirm-delete"
          >
            <Text style={styles.confirmBtnDeleteText}>Remove</Text>
          </Pressable>
        </View>
      )}
    </Pressable>
  );
}

export default React.memo(DoctorListCard);

const styles = StyleSheet.create({
  card: {
    backgroundColor: T.surface,
    borderRadius: 14,
    padding: T.sp16,
    marginHorizontal: T.sp16,
    marginBottom: T.sp12,
    borderWidth: 1,
    borderColor: T.border,
    gap: 10,
  },
  cardPressed: { opacity: 0.94, transform: [{ scale: 0.99 }] },
  topRow: { flexDirection: "row", alignItems: "center", gap: T.sp12 },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    flexShrink: 0,
  },
  avatarText: { fontFamily: "Inter_700Bold", fontSize: 16, letterSpacing: 0.5 },
  nameCol: { flex: 1, gap: 2 },
  name: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: T.text, letterSpacing: -0.2 },
  specialty: { fontFamily: "Inter_400Regular", fontSize: 13, color: T.textSec },
  specialtyMuted: { fontFamily: "Inter_400Regular", fontSize: 13, color: T.textMuted, fontStyle: "italic" },
  actions: { flexDirection: "row", gap: 6, alignItems: "center", flexShrink: 0 },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  editBtn: { backgroundColor: T.accent + "10", borderColor: T.accent + "30" },
  deleteBtn: { backgroundColor: T.danger + "10", borderColor: T.danger + "25" },
  deleteBtnActive: { backgroundColor: T.danger, borderColor: T.danger },
  tagsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  tag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: T.surfaceSubtle,
    borderWidth: 1,
    borderColor: T.border,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 20,
    maxWidth: 200,
  },
  tagAccent: { backgroundColor: T.accent + "12", borderColor: T.accent + "30" },
  tagSuccess: { backgroundColor: T.success + "12", borderColor: T.success + "30" },
  tagText: { fontFamily: "Inter_400Regular", fontSize: 11, color: T.textMuted, flexShrink: 1 },
  tagTextAccent: { color: T.accent, fontFamily: "Inter_500Medium" },
  tagTextSuccess: { color: T.success, fontFamily: "Inter_500Medium" },
  bio: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: T.textSec,
    lineHeight: 19,
    borderTopWidth: 1,
    borderTopColor: T.border,
    paddingTop: 8,
    marginTop: 2,
  },
  confirmBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: T.danger + "08",
    borderWidth: 1,
    borderColor: T.danger + "30",
    borderRadius: 10,
    padding: 10,
    marginTop: 2,
  },
  confirmText: {
    flex: 1,
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: T.danger,
  },
  confirmBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmBtnCancel: {
    backgroundColor: T.surfaceSubtle,
    borderWidth: 1,
    borderColor: T.border,
  },
  confirmBtnCancelText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: T.textSec,
  },
  confirmBtnDelete: {
    backgroundColor: T.danger,
  },
  confirmBtnDeleteText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: "#fff",
  },
});
