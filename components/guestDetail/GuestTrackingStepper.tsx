import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  ScrollView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { T, cardShadow } from "@/constants/adminTheme";

export const TRACKING_STEPS = [
  { key: "PRE_ARRIVAL", label: "Arrived Airport", icon: "airplane-outline" as const },
  { key: "ARRIVAL_TRANSFER", label: "Picked Up", icon: "car-outline" as const },
  { key: "HOTEL_CHECKIN", label: "Arrived Hotel", icon: "bed-outline" as const },
  { key: "TREATMENT", label: "At Appointment", icon: "medical-outline" as const },
  { key: "FOLLOWUP", label: "Back to Airport", icon: "return-up-forward-outline" as const },
  { key: "DEPARTURE", label: "Arrived Home", icon: "home-outline" as const },
];

interface Props {
  currentStep: string | null;
  onUpdateStep: (step: string) => void;
  updating?: boolean;
}

export function GuestTrackingStepper({ currentStep, onUpdateStep, updating }: Props) {
  const [showPicker, setShowPicker] = useState(false);

  const currentIdx = TRACKING_STEPS.findIndex((s) => s.key === currentStep);

  function getStepState(idx: number): "done" | "active" | "future" {
    if (currentIdx === -1) return "future";
    if (idx < currentIdx) return "done";
    if (idx === currentIdx) return "active";
    return "future";
  }

  return (
    <View style={[styles.card, cardShadow]}>
      <View style={styles.header}>
        <Text style={styles.title}>Tracking</Text>
        <Pressable
          onPress={() => setShowPicker(true)}
          style={styles.updateBtn}
          disabled={updating}
        >
          <Ionicons name="pencil-outline" size={14} color={T.accent} />
          <Text style={styles.updateBtnText}>Update</Text>
        </Pressable>
      </View>

      <View style={styles.stepperContainer}>
        {TRACKING_STEPS.map((step, idx) => {
          const state = getStepState(idx);
          const isLast = idx === TRACKING_STEPS.length - 1;

          return (
            <View key={step.key} style={styles.stepRow}>
              <View style={styles.stepLeft}>
                <View
                  style={[
                    styles.circle,
                    state === "done" && styles.circleDone,
                    state === "active" && styles.circleActive,
                    state === "future" && styles.circleFuture,
                  ]}
                >
                  {state === "done" ? (
                    <Ionicons name="checkmark" size={13} color="#fff" />
                  ) : (
                    <Ionicons
                      name={step.icon}
                      size={13}
                      color={state === "active" ? "#fff" : T.textMuted}
                    />
                  )}
                </View>
                {!isLast && (
                  <View
                    style={[
                      styles.line,
                      state === "done" ? styles.lineDone : styles.lineFuture,
                    ]}
                  />
                )}
              </View>

              <View style={styles.stepContent}>
                <Text
                  style={[
                    styles.stepLabel,
                    state === "active" && styles.stepLabelActive,
                    state === "done" && styles.stepLabelDone,
                    state === "future" && styles.stepLabelFuture,
                  ]}
                >
                  {step.label}
                </Text>
                {state === "active" && (
                  <Text style={styles.currentBadge}>Current</Text>
                )}
              </View>
            </View>
          );
        })}
      </View>

      <Modal
        visible={showPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPicker(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setShowPicker(false)} />
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>Set Current Step</Text>
          <ScrollView style={styles.sheetScroll} bounces={false}>
            {TRACKING_STEPS.map((step, idx) => {
              const isActive = step.key === currentStep;
              return (
                <Pressable
                  key={step.key}
                  onPress={() => {
                    onUpdateStep(step.key);
                    setShowPicker(false);
                  }}
                  style={[
                    styles.sheetItem,
                    isActive && styles.sheetItemActive,
                  ]}
                >
                  <View
                    style={[
                      styles.sheetCircle,
                      isActive && styles.sheetCircleActive,
                    ]}
                  >
                    <Text style={[styles.sheetNum, isActive && { color: "#fff" }]}>
                      {idx + 1}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.sheetItemText,
                      isActive && styles.sheetItemTextActive,
                    ]}
                  >
                    {step.label}
                  </Text>
                  {isActive && (
                    <Ionicons name="checkmark-circle" size={20} color={T.success} />
                  )}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </Modal>
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: T.sp16,
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    color: T.text,
  },
  updateBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: T.r8,
    borderWidth: 1,
    borderColor: T.border,
    backgroundColor: T.surface,
  },
  updateBtnText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: T.accent,
  },
  stepperContainer: {
    paddingLeft: 4,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    minHeight: 36,
  },
  stepLeft: {
    alignItems: "center",
    width: 28,
  },
  circle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  circleDone: {
    backgroundColor: T.success,
  },
  circleActive: {
    backgroundColor: T.accent,
  },
  circleFuture: {
    backgroundColor: T.inactiveBg,
    borderWidth: 1,
    borderColor: T.border,
  },
  line: {
    width: 2,
    flex: 1,
    minHeight: 12,
    marginVertical: 3,
  },
  lineDone: {
    backgroundColor: T.success,
  },
  lineFuture: {
    backgroundColor: T.border,
  },
  stepContent: {
    flex: 1,
    paddingTop: 4,
    paddingBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  stepLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
  },
  stepLabelDone: {
    color: T.success,
  },
  stepLabelActive: {
    color: T.accent,
    fontFamily: "Inter_600SemiBold",
  },
  stepLabelFuture: {
    color: T.textMuted,
  },
  currentBadge: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    color: T.accent,
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 20,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  sheet: {
    backgroundColor: T.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === "web" ? 34 : 48,
    maxHeight: "70%",
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: T.border,
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 4,
  },
  sheetTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 17,
    color: T.text,
    textAlign: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  sheetScroll: {
    padding: 12,
  },
  sheetItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: T.r10,
    marginBottom: 6,
    backgroundColor: T.surfaceSubtle,
  },
  sheetItemActive: {
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  sheetCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: T.inactiveBg,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: T.border,
  },
  sheetCircleActive: {
    backgroundColor: T.success,
    borderColor: T.success,
  },
  sheetNum: {
    fontFamily: "Inter_700Bold",
    fontSize: 12,
    color: T.textMuted,
  },
  sheetItemText: {
    fontFamily: "Inter_500Medium",
    fontSize: 15,
    color: T.text,
    flex: 1,
  },
  sheetItemTextActive: {
    fontFamily: "Inter_600SemiBold",
    color: T.accent,
  },
});
