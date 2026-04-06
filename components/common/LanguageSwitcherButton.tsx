import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { T } from "@/constants/adminTheme";
import { useLanguage } from "@/context/LanguageContext";
import { useT } from "@/hooks/useT";
import { LOCALE_FLAGS } from "@/i18n/types";
import type { SupportedLocale } from "@/i18n";

export function LanguageSwitcherButton() {
  const { locale, setLocale } = useLanguage();
  const t = useT();
  const tl = t.languageSwitcher;
  const [open, setOpen] = useState(false);
  const insets = useSafeAreaInsets();

  const OPTIONS: { locale: SupportedLocale; label: string; flag: string }[] = [
    { locale: "en", label: tl.english, flag: LOCALE_FLAGS.en },
    { locale: "ru", label: tl.russian, flag: LOCALE_FLAGS.ru },
  ];

  return (
    <>
      <Pressable
        style={({ pressed }) => [styles.btn, { opacity: pressed ? 0.7 : 1 }]}
        onPress={() => setOpen(true)}
        hitSlop={10}
        accessibilityLabel={tl.title}
        accessibilityRole="button"
      >
        <Text style={styles.flag}>{LOCALE_FLAGS[locale]}</Text>
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable
            style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.handle} />
            <Text style={styles.sheetTitle}>{tl.title}</Text>
            {OPTIONS.map((opt) => (
              <Pressable
                key={opt.locale}
                style={({ pressed }) => [
                  styles.option,
                  locale === opt.locale && styles.optionActive,
                  { opacity: pressed ? 0.7 : 1 },
                ]}
                onPress={() => {
                  setLocale(opt.locale);
                  setOpen(false);
                }}
              >
                <Text style={styles.optionFlag}>{opt.flag}</Text>
                <Text
                  style={[
                    styles.optionLabel,
                    locale === opt.locale && styles.optionLabelActive,
                  ]}
                >
                  {opt.label}
                </Text>
                {locale === opt.locale && (
                  <Ionicons name="checkmark" size={18} color={T.accent} />
                )}
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: T.surfaceSubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  flag: {
    fontSize: 18,
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: T.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 12,
    paddingHorizontal: 20,
    gap: 4,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
      },
      android: { elevation: 12 },
    }),
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: T.border,
    alignSelf: "center",
    marginBottom: 16,
  },
  sheetTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: T.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: T.r12,
  },
  optionActive: {
    backgroundColor: T.surfaceSubtle,
  },
  optionFlag: {
    fontSize: 22,
  },
  optionLabel: {
    flex: 1,
    fontFamily: "Inter_500Medium",
    fontSize: 16,
    color: T.text,
  },
  optionLabelActive: {
    fontFamily: "Inter_700Bold",
    color: T.accent,
  },
});
