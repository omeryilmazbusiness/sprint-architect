import React, { useEffect, useRef } from "react";
import {
  Animated,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { T } from "@/constants/adminTheme";
import { useLanguage } from "@/context/LanguageContext";
import {
  LOCALE_FLAGS,
  LOCALE_LABELS,
  type SupportedLocale,
} from "@/i18n";

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  visible: boolean;
  onClose: () => void;
}

// ─── Locale options in display order ─────────────────────────────────────────

const LOCALES: SupportedLocale[] = ["en", "ru", "tr"];

// ─── Component ────────────────────────────────────────────────────────────────

export function LanguageSelectorSheet({ visible, onClose }: Props) {
  const { locale, setLocale } = useLanguage();
  const slideAnim = useRef(new Animated.Value(300)).current;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: visible ? 0 : 300,
      useNativeDriver: Platform.OS !== "web",
      bounciness: 3,
    }).start();
  }, [visible]);

  function handleSelect(next: SupportedLocale) {
    setLocale(next);
    onClose();
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Pressable style={s.backdrop} onPress={onClose} />
      <Animated.View style={[s.sheet, { transform: [{ translateY: slideAnim }] }]}>
        {/* Handle */}
        <View style={s.handle} />

        {/* Header */}
        <View style={s.header}>
          <Ionicons name="language-outline" size={18} color={T.primary} />
          <Text style={s.headerTitle}>Language</Text>
        </View>

        <View style={s.divider} />

        {/* Options */}
        <View style={s.optionList}>
          {LOCALES.map((loc, i) => {
            const active = loc === locale;
            return (
              <React.Fragment key={loc}>
                {i > 0 ? <View style={s.optionDivider} /> : null}
                <Pressable
                  style={({ pressed }) => [
                    s.optionRow,
                    active && s.optionRowActive,
                    { opacity: pressed ? 0.7 : 1 },
                  ]}
                  onPress={() => handleSelect(loc)}
                >
                  <Text style={s.flag}>{LOCALE_FLAGS[loc]}</Text>
                  <Text style={[s.localeLabel, active && s.localeLabelActive]}>
                    {LOCALE_LABELS[loc]}
                  </Text>
                  {active ? (
                    <Ionicons name="checkmark-circle" size={18} color={T.primary} />
                  ) : (
                    <View style={s.emptyCheck} />
                  )}
                </Pressable>
              </React.Fragment>
            );
          })}
        </View>

        {/* Close */}
        <Pressable style={s.closeRow} onPress={onClose}>
          <Text style={s.closeText}>Close</Text>
        </Pressable>
      </Animated.View>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: T.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === "web" ? 34 : 32,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 12,
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  headerTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    color: T.text,
  },
  divider: {
    height: 1,
    backgroundColor: T.border,
    marginHorizontal: 20,
  },
  optionList: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: T.r10,
    minHeight: 52,
  },
  optionRowActive: {
    backgroundColor: `${T.primary}0D`,
  },
  flag: {
    fontSize: 22,
    lineHeight: 26,
  },
  localeLabel: {
    flex: 1,
    fontFamily: "Inter_500Medium",
    fontSize: 15,
    color: T.text,
  },
  localeLabelActive: {
    fontFamily: "Inter_700Bold",
    color: T.primary,
  },
  emptyCheck: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: T.border,
  },
  optionDivider: {
    height: 1,
    backgroundColor: T.surfaceSubtle,
  },
  closeRow: {
    marginTop: 8,
    marginHorizontal: 20,
    height: 48,
    borderRadius: T.r10,
    backgroundColor: T.surfaceSubtle,
    borderWidth: 1,
    borderColor: T.border,
    alignItems: "center",
    justifyContent: "center",
  },
  closeText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: T.textSec,
  },
});
