import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  Platform,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { T, cardShadow } from "@/constants/adminTheme";
import { StatusPill } from "@/components/ui";

interface HeroData {
  patient: {
    id: string;
    fullName: string;
    status: string;
    patientKey: string;
    phoneE164: string | null;
    email: string | null;
  };
  onApprove?: () => void;
  approving?: boolean;
}

const AVATAR_COLORS = [
  "#0A3D62", "#0369A1", "#059669", "#D97706",
  "#7C3AED", "#DB2777", "#0891B2",
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

function copyText(text: string) {
  if (Platform.OS === "web" && navigator?.clipboard) {
    navigator.clipboard.writeText(text).catch(() => null);
  } else {
    Alert.alert("Copied", text);
  }
}

export function GuestHeroCard({ patient, onApprove, approving }: HeroData) {
  const color = avatarColor(patient.fullName);
  const inits = initials(patient.fullName);
  const isWaiting = patient.status === "WAITING_APPROVAL";

  function handleCall() {
    if (patient.phoneE164) {
      Linking.openURL(`tel:${patient.phoneE164}`).catch(() => null);
    }
  }

  return (
    <View style={[styles.card, cardShadow]}>
      <View style={styles.topRow}>
        <View style={[styles.avatar, { backgroundColor: color + "18" }]}>
          <Text style={[styles.avatarText, { color }]}>{inits}</Text>
        </View>
        <View style={styles.nameBlock}>
          <Text style={styles.name} numberOfLines={2}>
            {patient.fullName}
          </Text>
          <StatusPill status={patient.status as any} />
        </View>
      </View>

      <View style={styles.keyRow}>
        <Ionicons name="key-outline" size={14} color={T.textMuted} />
        <Text style={styles.keyText}>{patient.patientKey}</Text>
        <Pressable
          onPress={() => copyText(patient.patientKey)}
          hitSlop={10}
          style={styles.copyBtn}
        >
          <Ionicons name="copy-outline" size={14} color={T.accent} />
        </Pressable>
      </View>

      <View style={styles.divider} />

      <View style={styles.actionsRow}>
        {isWaiting && (
          <Pressable
            onPress={onApprove}
            disabled={approving}
            style={[styles.actionBtn, styles.approveBtn]}
          >
            <Ionicons name="checkmark-circle-outline" size={16} color="#fff" />
            <Text style={styles.approveBtnText}>
              {approving ? "Approving…" : "Approve Guest"}
            </Text>
          </Pressable>
        )}

        {patient.phoneE164 && (
          <Pressable onPress={handleCall} style={styles.iconBtn}>
            <Ionicons name="call-outline" size={18} color={T.accent} />
          </Pressable>
        )}

        {patient.email ? (
          <Pressable
            onPress={() => Linking.openURL(`mailto:${patient.email}`).catch(() => null)}
            style={styles.iconBtn}
          >
            <Ionicons name="mail-outline" size={18} color={T.accent} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: T.surface,
    borderRadius: T.r16,
    padding: T.sp20,
    marginBottom: T.sp12,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: T.sp16,
    marginBottom: T.sp12,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 22,
  },
  nameBlock: {
    flex: 1,
    gap: 6,
    paddingTop: 2,
  },
  name: {
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 22,
    color: T.text,
    lineHeight: 28,
  },
  keyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  keyText: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 13,
    color: T.text,
    flex: 1,
    letterSpacing: 1,
  },
  copyBtn: {
    padding: 4,
  },
  divider: {
    height: 1,
    backgroundColor: T.border,
    marginVertical: T.sp12,
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: T.sp16,
    paddingVertical: 9,
    borderRadius: T.r10,
  },
  approveBtn: {
    backgroundColor: T.success,
    flex: 1,
    justifyContent: "center",
  },
  approveBtnText: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 14,
    color: "#fff",
  },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: T.r10,
    borderWidth: 1,
    borderColor: T.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: T.surface,
  },
});
