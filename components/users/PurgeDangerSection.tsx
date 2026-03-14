import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  TextInput,
  ActivityIndicator,
  ScrollView,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { T, cardShadow } from "@/constants/adminTheme";
import type { AdminUser } from "@/lib/api/adminUsers";
import {
  getPurgeImpact,
  purgeUser,
  type PurgeImpactResponse,
} from "@/lib/api/adminUsers";

interface Props {
  user: AdminUser;
  onPurged: () => void;
}

type PurgeMode = "STRICT" | "ANONYMIZE";

type Step = "danger" | "impact" | "confirm";

function BlockedTag({ reason }: { reason: string }) {
  const labels: Record<string, string> = {
    BLOCKED_SELF: "Cannot purge yourself",
    PRIMARY_MANAGER_DELETE_BLOCKED: "Is primary clinic manager",
    BLOCKED_REFERENCES_EXIST_INVOICES: "Has paid invoices",
    BLOCKED_REFERENCES_EXIST_AUDIT: "Has audit log entries",
  };
  return (
    <View style={s.blockedTag}>
      <Ionicons name="ban-outline" size={12} color={T.danger} />
      <Text style={s.blockedTagText}>{labels[reason] ?? reason}</Text>
    </View>
  );
}

function DepRow({ icon, label, count }: { icon: React.ComponentProps<typeof Ionicons>["name"]; label: string; count: number }) {
  const critical = count > 0;
  return (
    <View style={s.depRow}>
      <View style={[s.depIcon, { backgroundColor: critical ? T.dangerBg : T.surfaceSubtle }]}>
        <Ionicons name={icon} size={14} color={critical ? T.danger : T.textMuted} />
      </View>
      <Text style={s.depLabel}>{label}</Text>
      <Text style={[s.depCount, critical && s.depCountCritical]}>{count}</Text>
    </View>
  );
}

export function PurgeDangerSection({ user, onPurged }: Props) {
  const entityType = user.role === "MANAGER" ? "MANAGER" : "ADMIN";

  const [step, setStep] = useState<Step>("danger");
  const [isLoadingImpact, setIsLoadingImpact] = useState(false);
  const [impact, setImpact] = useState<PurgeImpactResponse | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const [mode, setMode] = useState<PurgeMode>("STRICT");
  const [isPurging, setIsPurging] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  const expectedConfirmText = `PURGE ${user.email}`;
  const confirmMatches = confirmText.trim() === expectedConfirmText;

  const canProceed =
    impact &&
    (impact.canPurge || mode === "ANONYMIZE") &&
    !impact.dependencies.isPrimaryManager;

  function openModal() {
    setStep("danger");
    setImpact(null);
    setConfirmText("");
    setMode("STRICT");
    setModalVisible(true);
  }

  function closeModal() {
    setModalVisible(false);
  }

  async function loadImpact() {
    setIsLoadingImpact(true);
    try {
      const result = await getPurgeImpact(user.id, entityType);
      setImpact(result);
      setStep("impact");
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Failed to load purge impact");
    } finally {
      setIsLoadingImpact(false);
    }
  }

  async function executePurge() {
    setIsPurging(true);
    try {
      await purgeUser(user.id, {
        entityType,
        confirmText: confirmText.trim(),
        mode,
      });
      setModalVisible(false);
      onPurged();
    } catch (e: any) {
      Alert.alert("Purge Failed", e?.message ?? "Failed to purge user");
    } finally {
      setIsPurging(false);
    }
  }

  return (
    <>
      <Text style={s.sectionLabel}>DANGER ZONE</Text>
      <View style={[s.dangerCard, cardShadow]}>
        <View style={s.dangerHeader}>
          <View style={s.dangerIconWrap}>
            <Ionicons name="nuclear-outline" size={18} color={T.danger} />
          </View>
          <View style={s.dangerHeaderText}>
            <Text style={s.dangerTitle}>Permanent Deletion</Text>
            <Text style={s.dangerSubtitle}>This action cannot be undone</Text>
          </View>
        </View>
        <Text style={s.dangerDesc}>
          Permanently removes this user and all associated data from the database.
          Requires SUPER_ADMIN confirmation.
        </Text>
        <Pressable
          style={({ pressed }) => [s.purgeBtn, { opacity: pressed ? 0.8 : 1 }]}
          onPress={openModal}
          testID="purge-open-btn"
        >
          <Ionicons name="trash-outline" size={15} color="#fff" />
          <Text style={s.purgeBtnText}>Permanently delete user</Text>
        </Pressable>
      </View>

      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={s.overlay}>
          <View style={s.modal}>

            {step === "danger" && (
              <>
                <View style={[s.modalIcon, { backgroundColor: T.dangerBg }]}>
                  <Ionicons name="warning-outline" size={28} color={T.danger} />
                </View>
                <Text style={s.modalTitle}>Are you absolutely sure?</Text>
                <Text style={s.modalBody}>
                  You are about to permanently delete{"\n"}
                  <Text style={{ fontFamily: "Inter_600SemiBold", color: T.text }}>
                    {user.fullName ?? user.email}
                  </Text>
                  {"\n"}This cannot be undone.
                </Text>
                <View style={s.modalBtns}>
                  <Pressable style={s.cancelBtn} onPress={closeModal}>
                    <Text style={s.cancelBtnText}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    style={[s.proceedBtn, { opacity: isLoadingImpact ? 0.7 : 1 }]}
                    onPress={loadImpact}
                    disabled={isLoadingImpact}
                    testID="purge-check-impact-btn"
                  >
                    {isLoadingImpact
                      ? <ActivityIndicator color="#fff" size="small" />
                      : <Text style={s.proceedBtnText}>Check impact →</Text>}
                  </Pressable>
                </View>
              </>
            )}

            {step === "impact" && impact && (
              <>
                <View style={[s.modalIcon, { backgroundColor: impact.canPurge ? "#FEF3C7" : T.dangerBg }]}>
                  <Ionicons
                    name={impact.canPurge ? "information-circle-outline" : "ban-outline"}
                    size={28}
                    color={impact.canPurge ? "#D97706" : T.danger}
                  />
                </View>
                <Text style={s.modalTitle}>Purge Impact</Text>
                <View style={s.impactBox}>
                  <DepRow icon="key-outline" label="Refresh tokens" count={impact.dependencies.refreshTokens} />
                  <DepRow icon="phone-portrait-outline" label="Devices" count={impact.dependencies.devices} />
                  <DepRow icon="document-text-outline" label="Credential requests" count={impact.dependencies.credentialRequests} />
                  <DepRow icon="receipt-outline" label="Invoices (paid by)" count={impact.dependencies.invoicesPaidBy} />
                  <DepRow icon="list-outline" label="Audit log entries" count={impact.dependencies.auditLogsActor} />
                </View>

                {impact.blockedReasons.length > 0 && mode === "STRICT" && (
                  <View style={s.blockedBox}>
                    {impact.blockedReasons.map((r) => (
                      <BlockedTag key={r} reason={r} />
                    ))}
                  </View>
                )}

                {(impact.dependencies.invoicesPaidBy > 0 || impact.dependencies.auditLogsActor > 0) && (
                  <View style={s.modeRow}>
                    <Text style={s.modeLabel}>Mode:</Text>
                    <Pressable
                      style={[s.modeBtn, mode === "STRICT" && s.modeBtnActive]}
                      onPress={() => setMode("STRICT")}
                    >
                      <Text style={[s.modeBtnText, mode === "STRICT" && s.modeBtnTextActive]}>
                        STRICT
                      </Text>
                    </Pressable>
                    <Pressable
                      style={[s.modeBtn, mode === "ANONYMIZE" && s.modeBtnActive]}
                      onPress={() => setMode("ANONYMIZE")}
                    >
                      <Text style={[s.modeBtnText, mode === "ANONYMIZE" && s.modeBtnTextActive]}>
                        ANONYMIZE
                      </Text>
                    </Pressable>
                  </View>
                )}

                {mode === "ANONYMIZE" && (
                  <Text style={s.modeNote}>
                    Anonymize will null invoice references and replace audit actor IDs with "SYSTEM_PURGED".
                  </Text>
                )}

                <View style={s.modalBtns}>
                  <Pressable style={s.cancelBtn} onPress={closeModal}>
                    <Text style={s.cancelBtnText}>Cancel</Text>
                  </Pressable>
                  {canProceed && (
                    <Pressable
                      style={s.proceedBtn}
                      onPress={() => setStep("confirm")}
                      testID="purge-proceed-btn"
                    >
                      <Text style={s.proceedBtnText}>Proceed →</Text>
                    </Pressable>
                  )}
                  {!canProceed && mode === "STRICT" && (
                    <View style={[s.proceedBtn, { backgroundColor: T.border }]}>
                      <Text style={[s.proceedBtnText, { color: T.textMuted }]}>Blocked</Text>
                    </View>
                  )}
                </View>
              </>
            )}

            {step === "confirm" && (
              <>
                <View style={[s.modalIcon, { backgroundColor: T.dangerBg }]}>
                  <Ionicons name="nuclear-outline" size={28} color={T.danger} />
                </View>
                <Text style={s.modalTitle}>Type to confirm</Text>
                <Text style={s.modalBody}>
                  This will permanently delete{"\n"}
                  <Text style={{ fontFamily: "Inter_600SemiBold", color: T.text }}>
                    {user.fullName ?? user.email}
                  </Text>
                  {"\n"}and all associated records.
                </Text>
                <View style={s.confirmHint}>
                  <Text style={s.confirmHintText}>Type exactly:</Text>
                  <Text style={s.confirmHintValue} selectable>{expectedConfirmText}</Text>
                </View>
                <TextInput
                  style={s.confirmInput}
                  placeholder={expectedConfirmText}
                  placeholderTextColor={T.textMuted}
                  value={confirmText}
                  onChangeText={setConfirmText}
                  autoCapitalize="none"
                  autoCorrect={false}
                  testID="purge-confirm-input"
                />
                <View style={s.modalBtns}>
                  <Pressable style={s.cancelBtn} onPress={closeModal} disabled={isPurging}>
                    <Text style={s.cancelBtnText}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    style={[
                      s.purgeConfirmBtn,
                      (!confirmMatches || isPurging) && { opacity: 0.4 },
                    ]}
                    onPress={executePurge}
                    disabled={!confirmMatches || isPurging}
                    testID="purge-execute-btn"
                  >
                    {isPurging
                      ? <ActivityIndicator color="#fff" size="small" />
                      : <Text style={s.purgeConfirmBtnText}>Delete permanently</Text>}
                  </Pressable>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  sectionLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    color: T.danger,
    letterSpacing: 1,
    marginBottom: 4,
    marginTop: 8,
    paddingHorizontal: 4,
  },
  dangerCard: {
    backgroundColor: T.surface,
    borderRadius: T.r12,
    padding: 16,
    borderWidth: 1,
    borderColor: T.dangerBorder,
    gap: 12,
  },
  dangerHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  dangerIconWrap: {
    width: 36,
    height: 36,
    borderRadius: T.r10,
    backgroundColor: T.dangerBg,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  dangerHeaderText: { flex: 1 },
  dangerTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: T.text,
    marginBottom: 2,
  },
  dangerSubtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: T.textMuted,
  },
  dangerDesc: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: T.textSec,
    lineHeight: 19,
  },
  purgeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: T.r10,
    backgroundColor: T.danger,
  },
  purgeBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: "#fff",
  },

  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  modal: {
    backgroundColor: T.surface,
    borderRadius: T.r20,
    padding: 24,
    width: "100%",
    alignItems: "center",
    gap: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 16,
  },
  modalIcon: {
    width: 60,
    height: 60,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 19,
    color: T.text,
    textAlign: "center",
  },
  modalBody: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: T.textSec,
    textAlign: "center",
    lineHeight: 22,
  },
  modalBtns: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
    marginTop: 4,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: T.r10,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: T.border,
  },
  cancelBtnText: {
    fontFamily: "Inter_500Medium",
    fontSize: 15,
    color: T.textSec,
  },
  proceedBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: T.r10,
    alignItems: "center",
    backgroundColor: T.primary,
  },
  proceedBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: "#fff",
  },
  purgeConfirmBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: T.r10,
    alignItems: "center",
    backgroundColor: T.danger,
  },
  purgeConfirmBtnText: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
    color: "#fff",
  },

  impactBox: {
    width: "100%",
    backgroundColor: T.surfaceSubtle,
    borderRadius: T.r10,
    padding: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: T.border,
  },
  depRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  depIcon: {
    width: 26,
    height: 26,
    borderRadius: T.r8,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  depLabel: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: T.textSec,
  },
  depCount: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: T.text,
  },
  depCountCritical: {
    color: T.danger,
  },

  blockedBox: {
    width: "100%",
    gap: 6,
  },
  blockedTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: T.dangerBg,
    borderRadius: T.r8,
    borderWidth: 1,
    borderColor: T.dangerBorder,
  },
  blockedTagText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: T.danger,
  },

  modeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    width: "100%",
  },
  modeLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: T.textSec,
  },
  modeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: T.r8,
    borderWidth: 1,
    borderColor: T.border,
    backgroundColor: T.surfaceSubtle,
  },
  modeBtnActive: {
    borderColor: T.accent,
    backgroundColor: T.accent + "15",
  },
  modeBtnText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: T.textMuted,
  },
  modeBtnTextActive: {
    color: T.accent,
  },
  modeNote: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: T.textMuted,
    textAlign: "center",
    lineHeight: 18,
    fontStyle: "italic",
  },

  confirmHint: {
    width: "100%",
    backgroundColor: T.surfaceSubtle,
    borderRadius: T.r8,
    padding: 10,
    borderWidth: 1,
    borderColor: T.border,
    gap: 4,
  },
  confirmHintText: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: T.textMuted,
  },
  confirmHintValue: {
    fontFamily: "Inter_700Bold",
    fontSize: 13,
    color: T.danger,
    letterSpacing: 0.5,
  },
  confirmInput: {
    width: "100%",
    borderWidth: 1.5,
    borderColor: T.border,
    borderRadius: T.r10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: T.text,
    backgroundColor: T.surfaceSubtle,
  },
});
