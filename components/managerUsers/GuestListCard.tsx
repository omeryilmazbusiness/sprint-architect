import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { T, cardShadow } from "@/constants/adminTheme";
import { copyToClipboard } from "@/lib/clipboard";
import { StatusPill } from "@/components/ui";

interface Patient {
  id: string;
  fullName: string;
  patientKey: string;
  phone?: string;
  phoneE164?: string | null;
  email?: string | null;
  nationalityCode?: string;
  arrivalDate?: string | null;
  departureDate?: string | null;
  status: "ACTIVE" | "INACTIVE" | "PENDING" | "APPROVED" | "ENDED" | "WAITING_APPROVAL";
  pendingDocCount?: number;
  hasPendingDocs?: boolean;
  hasTodayAppointment?: boolean;
  plan?: {
    hotelId: string | null;
    transportId: string | null;
    doctorId: string | null;
  } | null;
}

const AVATAR_COLORS = [
  "#0A3D62", "#0369A1", "#059669", "#D97706",
  "#7C3AED", "#DB2777", "#0891B2", "#65A30D",
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

function fmtDate(s?: string | null) {
  if (!s) return null;
  return new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

async function copyGuestKey(text: string) {
  const ok = await copyToClipboard(text);
  const label = "Invite Code";
  if (!ok) Alert.alert(label, text, [{ text: "OK" }]);
}

interface Props {
  patient: Patient;
  onPress: () => void;
  flagEmoji?: string | null;
}

function GuestListCard({ patient, onPress, flagEmoji }: Props) {
  const color = avatarColor(patient.fullName);
  const inits = initials(patient.fullName);

  const arrFmt = fmtDate(patient.arrivalDate);
  const depFmt = fmtDate(patient.departureDate);
  const travelLine = arrFmt
    ? depFmt
      ? `✈  ${arrFmt} → ${depFmt}`
      : `✈  Arriving ${arrFmt}`
    : null;

  const tags: { label: string; warn: boolean; accent?: boolean }[] = [];
  if (patient.hasPendingDocs || (patient.pendingDocCount ?? 0) > 0)
    tags.push({ label: "Docs Pending", warn: true });
  if (patient.hasTodayAppointment)
    tags.push({ label: "Today Appt", warn: false, accent: true });

  function handleCopy(e: { stopPropagation?: () => void }) {
    e?.stopPropagation?.();
    void copyGuestKey(patient.patientKey);
  }

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, cardShadow, { opacity: pressed ? 0.94 : 1 }]}
    >
      {/* Row 1: Avatar + Name + Status */}
      <View style={styles.topRow}>
        <View style={[styles.avatar, { backgroundColor: color + "18" }]}>
          <Text style={[styles.avatarText, { color }]}>{inits}</Text>
        </View>

        <View style={styles.nameCol}>
          <Text style={styles.name} numberOfLines={1}>
            {flagEmoji ? `${flagEmoji} ` : ""}
            {patient.fullName}
          </Text>
          {travelLine ? (
            <Text style={styles.travelLine} numberOfLines={1}>{travelLine}</Text>
          ) : (
            <Text style={styles.travelLineMuted}>No travel dates</Text>
          )}
        </View>

        <View style={styles.rightCol}>
          <StatusPill status={patient.status} small />
          <Ionicons name="chevron-forward" size={16} color={T.textMuted} style={styles.chevron} />
        </View>
      </View>

      {/* Row 2: Full key + copy */}
      <View style={styles.keyRow}>
        <Ionicons name="key-outline" size={13} color={T.textMuted} />
        <Text style={styles.keyText} numberOfLines={1}>KEY: {patient.patientKey}</Text>
        <Pressable
          onPress={handleCopy}
          hitSlop={10}
          style={({ pressed }) => [styles.copyBtn, { opacity: pressed ? 0.6 : 1 }]}
        >
          <Ionicons name="copy-outline" size={14} color={T.accent} />
        </Pressable>
        {patient.phone ? (
          <View style={styles.phoneSep} />
        ) : null}
        {patient.phone ? (
          <Ionicons name="call-outline" size={13} color={T.textMuted} />
        ) : null}
        {patient.phone ? (
          <Text style={styles.phoneText} numberOfLines={1}>{patient.phone}</Text>
        ) : null}
      </View>

      {/* Row 3: Tags */}
      {tags.length > 0 && (
        <View style={styles.tagRow}>
          {tags.map((t) => (
            <View
              key={t.label}
              style={[
                styles.tag,
                t.warn ? styles.tagWarn : t.accent ? styles.tagAccent : styles.tagNeutral,
              ]}
            >
              <Text
                style={[
                  styles.tagText,
                  t.warn ? styles.tagTextWarn : t.accent ? styles.tagTextAccent : undefined,
                ]}
              >
                {t.label}
              </Text>
            </View>
          ))}
        </View>
      )}
    </Pressable>
  );
}

export default React.memo(GuestListCard);

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
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 17,
  },
  nameCol: {
    flex: 1,
    gap: 3,
    minWidth: 0,
  },
  name: {
    fontFamily: "PlusJakartaSans_600SemiBold" as any,
    fontSize: 16,
    color: T.text,
  },
  travelLine: {
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 12,
    color: T.accent,
  },
  travelLineMuted: {
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 12,
    color: T.textMuted,
  },
  rightCol: {
    alignItems: "flex-end",
    gap: 6,
    flexShrink: 0,
  },
  chevron: {
    marginTop: 2,
  },
  keyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingLeft: 2,
  },
  keyText: {
    fontFamily: "PlusJakartaSans_500Medium",
    fontSize: 12,
    color: T.textSec,
    flex: 1,
  },
  copyBtn: {
    padding: 2,
  },
  phoneSep: {
    width: 1,
    height: 12,
    backgroundColor: T.border,
  },
  phoneText: {
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 12,
    color: T.textMuted,
    flexShrink: 1,
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    paddingLeft: 2,
  },
  tag: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
  },
  tagNeutral: {
    backgroundColor: T.surfaceSubtle,
    borderColor: T.border,
  },
  tagWarn: {
    backgroundColor: T.warningBg,
    borderColor: T.warningBorder,
  },
  tagAccent: {
    backgroundColor: "#EFF6FF",
    borderColor: "#BFDBFE",
  },
  tagText: {
    fontFamily: "PlusJakartaSans_500Medium",
    fontSize: 11,
    color: T.textMuted,
  },
  tagTextWarn: {
    color: T.warning,
  },
  tagTextAccent: {
    color: T.accent,
  },
});
