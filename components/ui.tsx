import React from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Platform,
  ViewStyle,
  TextStyle,
  TextInputProps,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { T, cardShadow, softShadow } from "@/constants/adminTheme";

// ─── Card ─────────────────────────────────────────────────────────────────────

export function Card({
  children,
  style,
  noPad,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
  noPad?: boolean;
}) {
  return (
    <View
      style={[
        styles.card,
        cardShadow,
        noPad ? { padding: 0 } : null,
        style,
      ]}
    >
      {children}
    </View>
  );
}

// ─── SectionHeader ────────────────────────────────────────────────────────────

export function SectionHeader({ label, style }: { label: string; style?: TextStyle }) {
  return (
    <Text style={[styles.sectionHeader, style]}>{label.toUpperCase()}</Text>
  );
}

// ─── Divider ─────────────────────────────────────────────────────────────────

export function Divider({ inset }: { inset?: number }) {
  return (
    <View
      style={[
        styles.divider,
        inset != null ? { marginLeft: inset } : null,
      ]}
    />
  );
}

// ─── StatusPill ───────────────────────────────────────────────────────────────

type StatusValue =
  | "ACTIVE" | "INACTIVE" | "SUSPENDED"
  | "PENDING" | "UNPAID" | "PAID"
  | "ADMIN" | "MANAGER"
  | string;

function pillColors(status: StatusValue): { bg: string; border: string; text: string } {
  switch (status) {
    case "ACTIVE":
    case "PAID":
      return { bg: T.successBg, border: T.successBorder, text: T.successText };
    case "UNPAID":
    case "SUSPENDED":
      return { bg: T.dangerBg, border: T.dangerBorder, text: T.dangerText };
    case "PENDING":
    case "INACTIVE":
      return { bg: T.warningBg, border: T.warningBorder, text: T.warningText };
    case "WAITING_APPROVAL":
      return { bg: "#FEF3C7", border: "#F59E0B", text: "#92400E" };
    case "APPROVED":
      return { bg: T.successBg, border: T.successBorder, text: T.successText };
    case "ENDED":
      return { bg: T.inactiveBg, border: T.inactiveBorder, text: T.inactiveText };
    case "ADMIN":
      return { bg: "#EFF6FF", border: "#BFDBFE", text: "#1E40AF" };
    case "MANAGER":
      return { bg: "#F0F9FF", border: "#BAE6FD", text: "#0369A1" };
    default:
      return { bg: T.inactiveBg, border: T.inactiveBorder, text: T.inactiveText };
  }
}

const STATUS_LABELS: Record<string, string> = {
  WAITING_APPROVAL: "Waiting Approval",
  PENDING: "Pending",
  APPROVED: "Approved",
  ACTIVE: "Active",
  INACTIVE: "Inactive",
  ENDED: "Ended",
  SUSPENDED: "Suspended",
  UNPAID: "Unpaid",
  PAID: "Paid",
  ADMIN: "Admin",
  MANAGER: "Manager",
};

export function StatusPill({ status, small }: { status: StatusValue; small?: boolean }) {
  const c = pillColors(status);
  const label = STATUS_LABELS[status] ?? status;
  return (
    <View
      style={[
        styles.pill,
        {
          backgroundColor: c.bg,
          borderColor: c.border,
          paddingHorizontal: small ? 8 : 10,
          paddingVertical: small ? 2 : 4,
        },
      ]}
    >
      <Text
        style={[
          styles.pillText,
          { color: c.text, fontSize: small ? 10 : 12 },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

// ─── ListRow ──────────────────────────────────────────────────────────────────

export function ListRow({
  icon,
  iconColor,
  label,
  subtitle,
  right,
  onPress,
  disabled,
  danger,
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  label: string;
  subtitle?: string;
  right?: React.ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  const ic = iconColor ?? (danger ? T.danger : T.accent);
  const lc = danger ? T.danger : T.text;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.listRow,
        { opacity: disabled ? 0.45 : pressed ? 0.7 : 1 },
      ]}
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
    >
      {icon && (
        <View style={[styles.listRowIcon, { backgroundColor: ic + "15" }]}>
          <Ionicons name={icon} size={18} color={ic} />
        </View>
      )}
      <View style={styles.listRowContent}>
        <Text style={[styles.listRowLabel, { color: lc }]}>{label}</Text>
        {subtitle && (
          <Text style={styles.listRowSub}>{subtitle}</Text>
        )}
      </View>
      {right != null ? (
        right
      ) : onPress && !disabled ? (
        <Ionicons name="chevron-forward" size={14} color={T.textMuted} />
      ) : null}
    </Pressable>
  );
}

// ─── TextField ────────────────────────────────────────────────────────────────

export function TextField({
  label,
  hint,
  error,
  style,
  ...props
}: TextInputProps & {
  label?: string;
  hint?: string;
  error?: string;
  style?: ViewStyle;
}) {
  return (
    <View style={[styles.tfGroup, style]}>
      {label && (
        <Text style={styles.tfLabel}>{label.toUpperCase()}</Text>
      )}
      <TextInput
        style={[
          styles.tfInput,
          error ? { borderColor: T.danger } : null,
        ]}
        placeholderTextColor={T.textMuted}
        {...props}
      />
      {hint && !error && (
        <Text style={styles.tfHint}>{hint}</Text>
      )}
      {error && (
        <Text style={[styles.tfHint, { color: T.danger }]}>{error}</Text>
      )}
    </View>
  );
}

// ─── Buttons ──────────────────────────────────────────────────────────────────

export function PrimaryButton({
  label,
  onPress,
  loading,
  disabled,
  style,
  icon,
}: {
  label: string;
  onPress?: () => void;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.primaryBtn,
        softShadow,
        { opacity: disabled || loading ? 0.65 : pressed ? 0.85 : 1 },
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
    >
      {loading ? (
        <ActivityIndicator color="#fff" size="small" />
      ) : (
        <>
          {icon && <Ionicons name={icon} size={18} color="#fff" />}
          <Text style={styles.primaryBtnText}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

export function SecondaryButton({
  label,
  onPress,
  disabled,
  style,
  icon,
}: {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  style?: ViewStyle;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.secondaryBtn,
        { opacity: disabled ? 0.45 : pressed ? 0.7 : 1 },
        style,
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      {icon && <Ionicons name={icon} size={16} color={T.text} />}
      <Text style={styles.secondaryBtnText}>{label}</Text>
    </Pressable>
  );
}

export function DestructiveButton({
  label,
  onPress,
  loading,
  disabled,
  style,
}: {
  label: string;
  onPress?: () => void;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.destructiveBtn,
        { opacity: disabled || loading ? 0.65 : pressed ? 0.85 : 1 },
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
    >
      {loading ? (
        <ActivityIndicator color={T.danger} size="small" />
      ) : (
        <Text style={styles.destructiveBtnText}>{label}</Text>
      )}
    </Pressable>
  );
}

// ─── State Views ──────────────────────────────────────────────────────────────

export function LoadingState({ message }: { message?: string }) {
  return (
    <View style={styles.stateCenter}>
      <ActivityIndicator color={T.accent} size="large" />
      {message && <Text style={styles.stateText}>{message}</Text>}
    </View>
  );
}

export function EmptyState({
  icon,
  title,
  subtitle,
  action,
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <View style={styles.stateCenter}>
      {icon && (
        <View style={styles.emptyIconWrap}>
          <Ionicons name={icon} size={28} color={T.textMuted} />
        </View>
      )}
      <Text style={styles.emptyTitle}>{title}</Text>
      {subtitle && <Text style={styles.emptySub}>{subtitle}</Text>}
      {action}
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <View style={styles.stateCenter}>
      <View style={[styles.emptyIconWrap, { backgroundColor: T.dangerBg }]}>
        <Ionicons name="warning-outline" size={28} color={T.danger} />
      </View>
      <Text style={styles.emptyTitle}>{message ?? "Something went wrong"}</Text>
      {onRetry && (
        <Pressable style={styles.retryBtn} onPress={onRetry}>
          <Text style={styles.retryBtnText}>Try Again</Text>
        </Pressable>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    backgroundColor: T.surface,
    borderRadius: T.r14,
    borderWidth: 1,
    borderColor: T.border,
    padding: 16,
    overflow: "hidden",
  },
  sectionHeader: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 11,
    letterSpacing: 0.8,
    color: T.textMuted,
    marginBottom: 8,
    marginTop: 4,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: T.border,
  },
  pill: {
    alignSelf: "flex-start",
    borderRadius: 20,
    borderWidth: 1,
  },
  pillText: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    letterSpacing: 0.3,
  },
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 13,
    gap: 12,
  },
  listRowIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  listRowContent: { flex: 1 },
  listRowLabel: {
    fontFamily: "PlusJakartaSans_500Medium",
    fontSize: 15,
    color: T.text,
  },
  listRowSub: {
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 12,
    color: T.textMuted,
    marginTop: 1,
  },
  tfGroup: { gap: 6 },
  tfLabel: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 11,
    letterSpacing: 0.5,
    color: T.textSec,
  },
  tfInput: {
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 15,
    color: T.text,
    backgroundColor: T.surface,
    borderWidth: 1.5,
    borderColor: T.border,
    borderRadius: T.r10,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === "ios" ? 12 : 10,
  },
  tfHint: {
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 12,
    color: T.textMuted,
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: T.primary,
    borderRadius: T.r12,
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  primaryBtnText: {
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 15,
    color: "#fff",
  },
  secondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: T.surface,
    borderWidth: 1.5,
    borderColor: T.borderStrong,
    borderRadius: T.r12,
    paddingVertical: 13,
    paddingHorizontal: 20,
  },
  secondaryBtnText: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 15,
    color: T.text,
  },
  destructiveBtn: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: T.dangerBg,
    borderWidth: 1.5,
    borderColor: T.dangerBorder,
    borderRadius: T.r12,
    paddingVertical: 13,
    paddingHorizontal: 20,
  },
  destructiveBtnText: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 15,
    color: T.danger,
  },
  stateCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 12,
  },
  stateText: {
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 14,
    color: T.textSec,
    marginTop: 8,
  },
  emptyIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: T.surfaceSubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 16,
    color: T.text,
    textAlign: "center",
  },
  emptySub: {
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 14,
    color: T.textSec,
    textAlign: "center",
    lineHeight: 20,
  },
  retryBtn: {
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: T.r8,
    backgroundColor: T.surfaceSubtle,
    borderWidth: 1,
    borderColor: T.border,
  },
  retryBtnText: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 14,
    color: T.text,
  },
});
