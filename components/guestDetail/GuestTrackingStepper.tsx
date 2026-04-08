import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { T, cardShadow } from "@/constants/adminTheme";

export const TRACKING_STEPS = [
  { key: "PRE_ARRIVAL",      label: "Pre-Arrival" },
  { key: "ARRIVAL_TRANSFER", label: "Arrival & Transfer" },
  { key: "HOTEL_CHECKIN",    label: "Hotel Check-In" },
  { key: "TREATMENT",        label: "Treatment" },
  { key: "FOLLOWUP",         label: "Recovery & Follow-Up" },
  { key: "DEPARTURE",        label: "Departure" },
];

interface Props {
  currentStep: string | null;
  onUpdateStep: (step: string) => void;
  updating?: boolean;
}

export function GuestTrackingStepper({ currentStep, onUpdateStep, updating }: Props) {
  const [optimisticStep, setOptimisticStep] = useState<string | null>(null);

  const displayStep = optimisticStep ?? currentStep;
  const currentIdx = TRACKING_STEPS.findIndex((s) => s.key === displayStep);

  function handleStepTap(step: string, idx: number) {
    if (updating) return;
    setOptimisticStep(step);
    onUpdateStep(step);
    setTimeout(() => setOptimisticStep(null), 3000);
  }

  function getState(idx: number): "done" | "active" | "future" {
    if (currentIdx === -1) return "future";
    if (idx < currentIdx) return "done";
    if (idx === currentIdx) return "active";
    return "future";
  }

  return (
    <View style={[styles.card, cardShadow]}>
      <View style={styles.header}>
        <Text style={styles.title}>Patient Journey</Text>
        {updating && (
          <Text style={styles.updatingLabel}>Updating…</Text>
        )}
      </View>

      <View style={styles.stepperContainer}>
        {TRACKING_STEPS.map((step, idx) => {
          const state = getState(idx);
          const isLast = idx === TRACKING_STEPS.length - 1;
          const isDone = state === "done";
          const isActive = state === "active";

          return (
            <View key={step.key} style={styles.stepRow}>
              <View style={styles.stepLeft}>
                <Pressable
                  onPress={() => handleStepTap(step.key, idx)}
                  disabled={updating}
                  hitSlop={8}
                >
                  <Ionicons
                    name={isDone || isActive ? "checkmark-circle" : "checkmark-circle-outline"}
                    size={26}
                    color={
                      isDone ? T.success :
                      isActive ? T.accent :
                      T.border
                    }
                  />
                </Pressable>
                {!isLast && (
                  <View
                    style={[
                      styles.line,
                      isDone ? styles.lineDone : styles.lineFuture,
                    ]}
                  />
                )}
              </View>

              <Pressable
                onPress={() => handleStepTap(step.key, idx)}
                disabled={updating}
                style={[
                  styles.stepContent,
                  isActive && styles.stepContentActive,
                ]}
              >
                <View style={styles.stepLabelRow}>
                  <Text
                    style={[
                      styles.stepLabel,
                      isDone && styles.stepLabelDone,
                      isActive && styles.stepLabelActive,
                      !isDone && !isActive && styles.stepLabelFuture,
                    ]}
                  >
                    {step.label}
                  </Text>
                  {isActive && (
                    <View style={styles.currentBadge}>
                      <Text style={styles.currentBadgeText}>Current</Text>
                    </View>
                  )}
                </View>
                {!isActive && !isDone && (
                  <Text style={styles.tapHint}>Tap to set</Text>
                )}
              </Pressable>
            </View>
          );
        })}
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: T.sp16,
  },
  title: {
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 16,
    color: T.text,
  },
  updatingLabel: {
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 12,
    color: T.textMuted,
  },
  stepperContainer: {
    gap: 0,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  stepLeft: {
    alignItems: "center",
    width: 28,
    paddingTop: 2,
  },
  line: {
    width: 2,
    flex: 1,
    minHeight: 18,
    marginTop: 3,
  },
  lineDone: {
    backgroundColor: T.success,
  },
  lineFuture: {
    backgroundColor: T.border,
  },
  stepContent: {
    flex: 1,
    paddingTop: 3,
    paddingBottom: 20,
    paddingHorizontal: 10,
    borderRadius: T.r10,
    marginBottom: 0,
  },
  stepContentActive: {
    backgroundColor: "#F0F9FF",
  },
  stepLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  stepLabel: {
    fontFamily: "PlusJakartaSans_500Medium",
    fontSize: 14,
  },
  stepLabelDone: {
    color: T.success,
    fontFamily: "PlusJakartaSans_600SemiBold",
  },
  stepLabelActive: {
    color: T.accent,
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 15,
  },
  stepLabelFuture: {
    color: T.textMuted,
  },
  tapHint: {
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 11,
    color: T.textMuted,
    marginTop: 2,
  },
  currentBadge: {
    backgroundColor: T.accent,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 20,
  },
  currentBadgeText: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 11,
    color: "#fff",
  },
});
