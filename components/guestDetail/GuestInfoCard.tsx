import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { T, cardShadow } from "@/constants/adminTheme";
import { COUNTRIES } from "@/constants/countries";

interface GuestInfo {
  phoneE164: string | null;
  email: string | null;
  nationality: string | null;
  nationalityCode: string | null;
  passportNo: string | null;
  dateOfBirth: string | null;
  arrivalDate: string | null;
  departureDate: string | null;
  notes: string | null;
  requestedServices: string[];
  companionRelation: string | null;
  emergencyContactName: string | null;
  emergencyContactPhoneE164: string | null;
}

interface Props {
  info: GuestInfo;
}

function getCountryInfo(code: string | null | undefined) {
  if (!code) return null;
  return COUNTRIES.find((c) => c.code === code.toUpperCase()) ?? null;
}

function fmtDate(s: string | null | undefined) {
  if (!s) return null;
  try {
    return new Date(s).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return s;
  }
}

function fmtService(s: string) {
  return s
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function InfoRow({
  icon,
  label,
  value,
  onPress,
  accent,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  value: string;
  onPress?: () => void;
  accent?: boolean;
}) {
  const content = (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={15} color={accent ? T.accent : T.textMuted} />
      <View style={styles.infoText}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text
          style={[styles.infoValue, accent && { color: T.accent }]}
          numberOfLines={2}
        >
          {value}
        </Text>
      </View>
      {onPress && (
        <Ionicons name="chevron-forward" size={13} color={T.textMuted} />
      )}
    </View>
  );
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [pressed && styles.pressed]}>
        {content}
      </Pressable>
    );
  }
  return content;
}

export function GuestInfoCard({ info }: Props) {
  const [notesExpanded, setNotesExpanded] = useState(false);
  const country = getCountryInfo(info.nationalityCode);
  const arrFmt = fmtDate(info.arrivalDate);
  const depFmt = fmtDate(info.departureDate);

  const hasAnyData =
    info.phoneE164 ||
    info.email ||
    country ||
    info.passportNo ||
    info.dateOfBirth ||
    arrFmt ||
    depFmt ||
    info.requestedServices.length > 0 ||
    info.notes ||
    info.emergencyContactName ||
    info.companionRelation;

  if (!hasAnyData) return null;

  return (
    <View style={[styles.card, cardShadow]}>
      <View style={styles.sectionHeader}>
        <Ionicons name="person-circle-outline" size={16} color={T.accent} />
        <Text style={styles.sectionTitle}>Guest Details</Text>
      </View>

      {country && (
        <View style={styles.nationalityRow}>
          <Text style={styles.flagEmoji}>{country.flag}</Text>
          <Text style={styles.nationalityName}>{country.name}</Text>
        </View>
      )}

      {info.passportNo && (
        <InfoRow
          icon="card-outline"
          label="Passport"
          value={info.passportNo}
        />
      )}

      {info.dateOfBirth && (
        <InfoRow
          icon="calendar-outline"
          label="Date of Birth"
          value={fmtDate(info.dateOfBirth) ?? info.dateOfBirth}
        />
      )}

      {info.phoneE164 && (
        <InfoRow
          icon="call-outline"
          label="Phone"
          value={info.phoneE164}
          accent
          onPress={() =>
            Linking.openURL(`tel:${info.phoneE164}`).catch(() => null)
          }
        />
      )}

      {info.email && (
        <InfoRow
          icon="mail-outline"
          label="Email"
          value={info.email}
          accent
          onPress={() =>
            Linking.openURL(`mailto:${info.email}`).catch(() => null)
          }
        />
      )}

      {(info.emergencyContactName || info.companionRelation) && (
        <View style={styles.divider} />
      )}

      {info.emergencyContactName && (
        <InfoRow
          icon="people-outline"
          label={`Companion${info.companionRelation ? ` (${info.companionRelation})` : ""}`}
          value={[
            info.emergencyContactName,
            info.emergencyContactPhoneE164,
          ]
            .filter(Boolean)
            .join(" · ")}
          accent={!!info.emergencyContactPhoneE164}
          onPress={
            info.emergencyContactPhoneE164
              ? () =>
                  Linking.openURL(
                    `tel:${info.emergencyContactPhoneE164}`
                  ).catch(() => null)
              : undefined
          }
        />
      )}

      {(arrFmt || depFmt || info.requestedServices.length > 0) && (
        <View style={styles.divider} />
      )}

      {(arrFmt || depFmt) && (
        <InfoRow
          icon="airplane-outline"
          label="Travel Dates"
          value={`${arrFmt ?? "–"}  →  ${depFmt ?? "–"}`}
        />
      )}

      {info.requestedServices.length > 0 && (
        <View style={styles.servicesBlock}>
          <Text style={styles.servicesLabel}>Services Requested</Text>
          <View style={styles.chipRow}>
            {info.requestedServices.map((s) => (
              <View key={s} style={styles.chip}>
                <Text style={styles.chipText}>{fmtService(s)}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {info.notes && (
        <>
          <View style={styles.divider} />
          <Pressable
            onPress={() => setNotesExpanded((v) => !v)}
            style={styles.notesHeader}
          >
            <Ionicons name="document-text-outline" size={15} color={T.textMuted} />
            <Text style={styles.notesLabel}>Notes</Text>
            <Ionicons
              name={notesExpanded ? "chevron-up" : "chevron-down"}
              size={14}
              color={T.textMuted}
            />
          </Pressable>
          {notesExpanded && (
            <Text style={styles.notesText}>{info.notes}</Text>
          )}
        </>
      )}
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
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginBottom: T.sp16,
  },
  sectionTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    color: T.text,
  },
  nationalityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: T.sp12,
    paddingLeft: 2,
  },
  flagEmoji: {
    fontSize: 26,
  },
  nationalityName: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: T.text,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 7,
  },
  infoText: {
    flex: 1,
  },
  infoLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: T.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  infoValue: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: T.text,
    marginTop: 1,
  },
  pressed: {
    opacity: 0.7,
  },
  divider: {
    height: 1,
    backgroundColor: T.border,
    marginVertical: 10,
  },
  servicesBlock: {
    paddingVertical: 7,
    gap: 8,
  },
  servicesLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: T.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  chip: {
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  chipText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: T.accent,
  },
  notesHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 7,
  },
  notesLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: T.textSec,
    flex: 1,
  },
  notesText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: T.textSec,
    lineHeight: 20,
    paddingTop: 4,
    paddingLeft: 2,
  },
});
