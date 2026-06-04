import React, { useRef, useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  Animated,
  Platform,
  Linking,
  Alert,
  ActivityIndicator,
  useWindowDimensions,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { T, cardShadow } from "@/constants/adminTheme";
import { copyToClipboard } from "@/lib/clipboard";
import { StatusPill } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { isReviewMode } from "@/lib/isReviewMode";
import {
  getPatientSummary,
  deactivatePatient,
  regeneratePatientAccessKey,
  type PatientSummary,
} from "@/lib/api/adminPatients";

// ─── Constants ────────────────────────────────────────────────────────────────

const NATIVE_DRIVER = Platform.OS !== "web";
const SHEET_MAX_RATIO = 0.88;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function maskKey(key: string): string {
  // GUEST-XXXX-XXXX  →  GUEST-••••-XXXX
  const parts = key.split("-");
  if (parts.length < 3) return key;
  const masked = parts.slice(0, parts.length - 1).join("-").replace(/[A-Z0-9]/g, "•");
  return `${masked}-${parts[parts.length - 1]}`;
}

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

function fmtDate(d: string | null): string | null {
  if (!d) return null;
  try {
    return new Date(d).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return d;
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function AvatarInitials({ name, size = 46 }: { name: string; size?: number }) {
  return (
    <View
      style={[
        styles.avatar,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
    >
      <Text style={[styles.avatarText, { fontSize: size * 0.35 }]}>
        {initials(name)}
      </Text>
    </View>
  );
}

function SectionLabel({ label }: { label: string }) {
  return <Text style={styles.sectionLabel}>{label}</Text>;
}

function InfoRow({
  icon,
  label,
  value,
  onPress,
  danger,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  onPress?: () => void;
  danger?: boolean;
}) {
  const content = (
    <View style={styles.infoRow}>
      <View style={[styles.infoIconWrap, { backgroundColor: (danger ? T.danger : T.accent) + "14" }]}>
        <Ionicons name={icon} size={14} color={danger ? T.danger : T.accent} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text
          style={[styles.infoValue, danger && { color: T.danger }]}
          numberOfLines={3}
        >
          {value}
        </Text>
      </View>
      {onPress && (
        <Ionicons name="chevron-forward" size={14} color={T.textMuted} />
      )}
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
        onPress={onPress}
      >
        {content}
      </Pressable>
    );
  }
  return content;
}

function PatientKeyRow({
  patientKey,
  onCopied,
}: {
  patientKey: string;
  onCopied: () => void;
}) {
  const [revealed, setRevealed] = useState(false);

  async function handleCopy() {
    const ok = await copyToClipboard(patientKey);
    if (ok) onCopied();
  }

  return (
    <View style={styles.keyRow}>
      <View style={[styles.infoIconWrap, { backgroundColor: T.primary + "12" }]}>
        <Ionicons name="key-outline" size={14} color={T.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.infoLabel}>Access Key</Text>
        <Text style={styles.keyValue} numberOfLines={1}>
          {revealed ? patientKey : maskKey(patientKey)}
        </Text>
      </View>
      <View style={styles.keyActions}>
        <Pressable
          style={({ pressed }) => [styles.keyBtn, { opacity: pressed ? 0.7 : 1 }]}
          onPress={() => setRevealed((r) => !r)}
          hitSlop={8}
        >
          <Ionicons
            name={revealed ? "eye-off-outline" : "eye-outline"}
            size={15}
            color={T.textMuted}
          />
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.keyBtn, { opacity: pressed ? 0.7 : 1 }]}
          onPress={handleCopy}
          hitSlop={8}
        >
          <Ionicons name="copy-outline" size={15} color={T.accent} />
        </Pressable>
      </View>
    </View>
  );
}

function NewKeyBanner({
  newKey,
  onDismiss,
}: {
  newKey: string;
  onDismiss: () => void;
}) {
  async function handleCopy() {
    const ok = await copyToClipboard(newKey);
    if (ok) Alert.alert("Copied", "New access key copied to clipboard.");
  }

  return (
    <View style={styles.newKeyBanner}>
      <View style={styles.newKeyHeader}>
        <Ionicons name="checkmark-circle" size={16} color="#16A34A" />
        <Text style={styles.newKeyTitle}>New Access Key Generated</Text>
        <Pressable onPress={onDismiss} hitSlop={8}>
          <Ionicons name="close" size={16} color={T.textMuted} />
        </Pressable>
      </View>
      <Text style={styles.newKeyValue}>{newKey}</Text>
      <Text style={styles.newKeyHint}>Share this key with the guest. It will not be shown again.</Text>
      <Pressable style={styles.newKeyCopyBtn} onPress={handleCopy}>
        <Ionicons name="copy-outline" size={14} color="#16A34A" />
        <Text style={styles.newKeyCopyText}>Copy Key</Text>
      </Pressable>
    </View>
  );
}

// ─── Sheet content ────────────────────────────────────────────────────────────

function SheetContent({
  patient,
  isSuperAdmin,
  onClose,
  onUpdated,
}: {
  patient: PatientSummary;
  isSuperAdmin: boolean;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copiedToast, setCopiedToast] = useState(false);

  const hasTravelInfo =
    patient.nationality || patient.passportNo || patient.arrivalDate || patient.departureDate;
  const hasService = patient.requestedService || patient.notes;

  function showCopiedToast() {
    setCopiedToast(true);
    setTimeout(() => setCopiedToast(false), 1800);
  }

  function handleDeactivate() {
    Alert.alert(
      "Deactivate Guest",
      `Deactivate ${patient.fullName}? Their access will be suspended. This can be reviewed later.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Deactivate",
          style: "destructive",
          onPress: async () => {
            setIsDeactivating(true);
            try {
              await deactivatePatient(patient.id);
              onUpdated();
              onClose();
            } catch (e: any) {
              Alert.alert("Error", e?.message ?? "Failed to deactivate patient");
            } finally {
              setIsDeactivating(false);
            }
          },
        },
      ],
    );
  }

  function handleRegenerate() {
    Alert.alert(
      "Regenerate Access Key",
      `Generate a new access key for ${patient.fullName}? The old key will be invalidated and all devices will be logged out.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Regenerate",
          style: "destructive",
          onPress: async () => {
            setIsRegenerating(true);
            try {
              const result = await regeneratePatientAccessKey(patient.id);
              setNewKey(result.oneTimeAccessKey);
              onUpdated();
            } catch (e: any) {
              Alert.alert("Error", e?.message ?? "Failed to regenerate key");
            } finally {
              setIsRegenerating(false);
            }
          },
        },
      ],
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <View style={styles.sheetHeader}>
        <AvatarInitials name={patient.fullName} size={46} />
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={styles.patientName} numberOfLines={1}>
            {patient.fullName}
          </Text>
          <View style={styles.headerMeta}>
            <StatusPill status={patient.status as any} small />
            <Text style={styles.createdAt}>
              {fmtDate(patient.createdAt) ?? "—"}
            </Text>
          </View>
        </View>
        <Pressable
          style={({ pressed }) => [styles.closeBtn, { opacity: pressed ? 0.7 : 1 }]}
          onPress={onClose}
          hitSlop={8}
        >
          <Ionicons name="close" size={20} color={T.textMuted} />
        </Pressable>
      </View>

      {/* ── Clinic chip ────────────────────────────────────────────────── */}
      <Pressable
        style={({ pressed }) => [
          styles.clinicChip,
          { opacity: pressed ? 0.7 : 1 },
        ]}
        onPress={() => {
          onClose();
          router.push(`/(admin)/clinics/${patient.clinicId}`);
        }}
      >
        <Ionicons name="business-outline" size={13} color={T.accent} />
        <Text style={styles.clinicChipText} numberOfLines={1}>
          {patient.clinicName}
        </Text>
        <Ionicons name="chevron-forward" size={12} color={T.accent} />
      </Pressable>

      <View style={styles.divider} />

      {/* ── Scrollable body ────────────────────────────────────────────── */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* New key banner */}
        {newKey && (
          <NewKeyBanner newKey={newKey} onDismiss={() => setNewKey(null)} />
        )}

        {/* Copied toast */}
        {copiedToast && (
          <View style={styles.copiedToast}>
            <Ionicons name="checkmark-circle" size={14} color="#16A34A" />
            <Text style={styles.copiedToastText}>Copied to clipboard</Text>
          </View>
        )}

        {/* ── Identity ─────────────────────────────────────────────────── */}
        <SectionLabel label="IDENTITY" />
        <View style={styles.card}>
          <PatientKeyRow patientKey={patient.patientKey} onCopied={showCopiedToast} />

          {patient.phoneE164 && (
            <>
              <View style={styles.cardDivider} />
              <InfoRow
                icon="call-outline"
                label="Phone"
                value={patient.phoneE164}
                onPress={() => Linking.openURL(`tel:${patient.phoneE164}`)}
              />
            </>
          )}
          {patient.email && (
            <>
              <View style={styles.cardDivider} />
              <InfoRow
                icon="mail-outline"
                label="Email"
                value={patient.email}
                onPress={() => Linking.openURL(`mailto:${patient.email}`)}
              />
            </>
          )}
        </View>

        {/* ── Travel info ──────────────────────────────────────────────── */}
        {hasTravelInfo && (
          <>
            <SectionLabel label="TRAVEL & IDENTITY" />
            <View style={styles.card}>
              {patient.nationality && (
                <InfoRow
                  icon="flag-outline"
                  label={patient.nationalityCode ? `Nationality (${patient.nationalityCode})` : "Nationality"}
                  value={patient.nationality}
                />
              )}
              {!isReviewMode() && patient.passportNo ? (
                <>
                  {patient.nationality && <View style={styles.cardDivider} />}
                  <InfoRow
                    icon="card-outline"
                    label="Passport No."
                    value={patient.passportNo}
                  />
                </>
              ) : null}
              {patient.arrivalDate && (
                <>
                  {(patient.nationality || patient.passportNo) && <View style={styles.cardDivider} />}
                  <InfoRow
                    icon="airplane-outline"
                    label="Arrival"
                    value={fmtDate(patient.arrivalDate) ?? patient.arrivalDate}
                  />
                </>
              )}
              {patient.departureDate && (
                <>
                  {(patient.nationality || patient.passportNo || patient.arrivalDate) && (
                    <View style={styles.cardDivider} />
                  )}
                  <InfoRow
                    icon="airplane-outline"
                    label="Departure"
                    value={fmtDate(patient.departureDate) ?? patient.departureDate}
                  />
                </>
              )}
            </View>
          </>
        )}

        {/* ── Service ──────────────────────────────────────────────────── */}
        {hasService && (
          <>
            <SectionLabel label="SERVICE" />
            <View style={styles.card}>
              {patient.requestedService && (
                <InfoRow
                  icon="person-outline"
                  label="Requested Service"
                  value={patient.requestedService}
                />
              )}
              {patient.notes && (
                <>
                  {patient.requestedService && <View style={styles.cardDivider} />}
                  <InfoRow
                    icon="document-text-outline"
                    label="Notes"
                    value={patient.notes}
                  />
                </>
              )}
            </View>
          </>
        )}

        {/* Bottom spacer */}
        <View style={{ height: 8 }} />
      </ScrollView>

      {/* ── Actions ────────────────────────────────────────────────────── */}
      <View style={styles.actions}>
        {isSuperAdmin && (
          <Pressable
            style={({ pressed }) => [
              styles.actionBtn,
              styles.actionBtnSecondary,
              { opacity: pressed || isRegenerating ? 0.7 : 1 },
            ]}
            onPress={handleRegenerate}
            disabled={isRegenerating}
          >
            {isRegenerating ? (
              <ActivityIndicator size="small" color={T.primary} />
            ) : (
              <Ionicons name="refresh-outline" size={16} color={T.primary} />
            )}
            <Text style={[styles.actionBtnText, { color: T.primary }]}>
              {isRegenerating ? "Regenerating…" : "Regenerate Key"}
            </Text>
          </Pressable>
        )}

        {patient.status !== "INACTIVE" && (
          <Pressable
            style={({ pressed }) => [
              styles.actionBtn,
              styles.actionBtnDanger,
              { opacity: pressed || isDeactivating ? 0.7 : 1 },
            ]}
            onPress={handleDeactivate}
            disabled={isDeactivating}
          >
            {isDeactivating ? (
              <ActivityIndicator size="small" color={T.danger} />
            ) : (
              <Ionicons name="person-remove-outline" size={16} color={T.danger} />
            )}
            <Text style={[styles.actionBtnText, { color: T.danger }]}>
              {isDeactivating ? "Deactivating…" : "Deactivate Guest"}
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

interface Props {
  patientId: string | null;
  onClose: () => void;
  onUpdated?: () => void;
}

export function PatientSummarySheet({ patientId, onClose, onUpdated }: Props) {
  const { height: screenHeight } = useWindowDimensions();
  const { user } = useAuth();
  const isSuperAdmin = user?.role === "SUPER_ADMIN";
  const qc = useQueryClient();

  const slideY = useRef(new Animated.Value(screenHeight)).current;
  const visible = patientId !== null;

  useEffect(() => {
    if (visible) {
      Animated.spring(slideY, {
        toValue: 0,
        useNativeDriver: NATIVE_DRIVER,
        tension: 65,
        friction: 11,
      }).start();
    } else {
      Animated.timing(slideY, {
        toValue: screenHeight,
        duration: 220,
        useNativeDriver: NATIVE_DRIVER,
      }).start();
    }
  }, [visible, screenHeight]);

  const { data: patient, isLoading, isError, refetch } = useQuery<PatientSummary>({
    queryKey: ["/v1/admin/patients", patientId],
    queryFn: () => getPatientSummary(patientId!),
    enabled: !!patientId,
    staleTime: 30_000,
  });

  function handleUpdated() {
    qc.invalidateQueries({ queryKey: ["/v1/admin/users"] });
    onUpdated?.();
  }

  const maxHeight = screenHeight * SHEET_MAX_RATIO;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      {/* Backdrop */}
      <Pressable style={styles.backdrop} onPress={onClose} />

      {/* Slide-up sheet */}
      <Animated.View
        style={[
          styles.sheet,
          {
            maxHeight,
            transform: [{ translateY: slideY }],
          },
        ]}
      >
        {/* Handle */}
        <View style={styles.handle} />

        {/* Loading */}
        {isLoading && (
          <View style={styles.centered}>
            <ActivityIndicator color={T.accent} size="large" />
            <Text style={styles.loadingText}>Loading patient…</Text>
          </View>
        )}

        {/* Error */}
        {isError && !isLoading && (
          <View style={styles.centered}>
            <Ionicons name="warning-outline" size={32} color={T.danger} />
            <Text style={styles.errorText}>Failed to load patient data.</Text>
            <Pressable
              style={({ pressed }) => [
                styles.retryBtn,
                { opacity: pressed ? 0.7 : 1 },
              ]}
              onPress={() => refetch()}
            >
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          </View>
        )}

        {/* Content */}
        {patient && !isLoading && (
          <SheetContent
            patient={patient}
            isSuperAdmin={isSuperAdmin}
            onClose={onClose}
            onUpdated={handleUpdated}
          />
        )}
      </Animated.View>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.48)",
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: T.surface,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    minHeight: 300,
    paddingBottom: Platform.OS === "web" ? 34 : 24,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
      },
      android: { elevation: 24 },
      web: { boxShadow: "0 -4px 32px rgba(0,0,0,0.12)" } as any,
    }),
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: T.border,
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 4,
  },

  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 12,
  },
  loadingText: {
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 14,
    color: T.textMuted,
    marginTop: 4,
  },
  errorText: {
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 14,
    color: T.text,
    textAlign: "center",
  },
  retryBtn: {
    backgroundColor: T.accent,
    paddingHorizontal: 20,
    paddingVertical: 9,
    borderRadius: 10,
    marginTop: 4,
  },
  retryText: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 13,
    color: "#fff",
  },

  // ── Header ──────────────────────────────────────────────────────────────
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 12,
    gap: 12,
  },
  avatar: {
    backgroundColor: T.primary + "18",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    borderWidth: 1.5,
    borderColor: T.primary + "28",
  },
  avatarText: {
    fontFamily: "PlusJakartaSans_700Bold",
    color: T.primary,
  },
  patientName: {
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 17,
    color: T.text,
  },
  headerMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  createdAt: {
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 11,
    color: T.textMuted,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: T.bg,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },

  // ── Clinic chip ─────────────────────────────────────────────────────────
  clinicChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginHorizontal: 18,
    marginBottom: 12,
    backgroundColor: T.accent + "0E",
    borderWidth: 1,
    borderColor: T.accent + "28",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    alignSelf: "flex-start",
  },
  clinicChipText: {
    fontFamily: "PlusJakartaSans_500Medium",
    fontSize: 12.5,
    color: T.accent,
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: T.border,
    marginHorizontal: 18,
    marginBottom: 4,
  },

  // ── Scroll content ──────────────────────────────────────────────────────
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 0,
  },

  sectionLabel: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 11,
    color: T.textMuted,
    letterSpacing: 0.8,
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 2,
  },

  card: {
    backgroundColor: T.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: T.border,
    marginBottom: 4,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: { elevation: 1 },
      web: { boxShadow: "0 1px 4px rgba(0,0,0,0.05)" } as any,
    }),
  },
  cardDivider: {
    height: 1,
    backgroundColor: T.border,
    marginLeft: 48,
  },

  // ── Info rows ───────────────────────────────────────────────────────────
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 13,
  },
  infoIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: 1,
  },
  infoLabel: {
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 11,
    color: T.textMuted,
    marginBottom: 2,
  },
  infoValue: {
    fontFamily: "PlusJakartaSans_500Medium",
    fontSize: 14,
    color: T.text,
    lineHeight: 19,
  },

  // ── Patient key ─────────────────────────────────────────────────────────
  keyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 13,
  },
  keyValue: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 15,
    color: T.primary,
    letterSpacing: 1,
  },
  keyActions: {
    flexDirection: "row",
    gap: 2,
    flexShrink: 0,
  },
  keyBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: T.bg,
    alignItems: "center",
    justifyContent: "center",
  },

  // ── New key banner ──────────────────────────────────────────────────────
  newKeyBanner: {
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    borderRadius: 12,
    padding: 14,
    gap: 8,
    marginBottom: 12,
  },
  newKeyHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  newKeyTitle: {
    flex: 1,
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 13,
    color: "#15803D",
  },
  newKeyValue: {
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 16,
    color: "#166534",
    letterSpacing: 1.5,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: "#DCFCE7",
    borderRadius: 8,
  },
  newKeyHint: {
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 11.5,
    color: "#16A34A",
  },
  newKeyCopyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#DCFCE7",
    borderRadius: 8,
  },
  newKeyCopyText: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 12,
    color: "#16A34A",
  },

  // ── Copied toast ────────────────────────────────────────────────────────
  copiedToast: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 10,
    alignSelf: "flex-start",
  },
  copiedToastText: {
    fontFamily: "PlusJakartaSans_500Medium",
    fontSize: 12,
    color: "#16A34A",
  },

  // ── Actions ─────────────────────────────────────────────────────────────
  actions: {
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: T.border,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    minHeight: 46,
  },
  actionBtnSecondary: {
    backgroundColor: T.primary + "0A",
    borderColor: T.primary + "30",
  },
  actionBtnDanger: {
    backgroundColor: T.dangerBg,
    borderColor: T.dangerBorder,
  },
  actionBtnText: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 14,
  },
});
