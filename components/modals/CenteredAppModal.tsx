import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { T } from "@/constants/adminTheme";

export interface CenteredAppModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** Shown to the left of the title (e.g. back arrow). */
  headerLeading?: React.ReactNode;
  /** When false, children render in a flex container (for FlatList). Default true. */
  scroll?: boolean;
  /** Min height for non-scroll body (list pickers). */
  bodyMinHeight?: number;
  contentContainerStyle?: StyleProp<ViewStyle>;
  testID?: string;
}

const MAX_CARD_WIDTH = 520;

/**
 * Centered modal shell: full backdrop, card in the middle of the screen,
 * safe-area aware, keyboard-friendly. Replaces bottom sheets that used
 * translateY(screenHeight) (often rendered off-screen / empty).
 */
export function CenteredAppModal({
  visible,
  onClose,
  title,
  children,
  footer,
  headerLeading,
  scroll = true,
  bodyMinHeight = 0,
  contentContainerStyle,
  testID,
}: CenteredAppModalProps) {
  const insets = useSafeAreaInsets();
  const { width: windowW, height: windowH } = useWindowDimensions();

  const verticalPad = insets.top + insets.bottom + 24;
  const maxCardHeight = Math.max(280, windowH * 0.88 - verticalPad);
  const cardWidth = Math.min(windowW - 32, MAX_CARD_WIDTH);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
      testID={testID}
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View
          style={[
            styles.overlay,
            {
              paddingTop: insets.top + 12,
              paddingBottom: insets.bottom + 12,
            },
          ]}
        >
          <Pressable
            style={StyleSheet.absoluteFillObject}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close"
          />
          <View
            style={[styles.card, { width: cardWidth, maxHeight: maxCardHeight }]}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.header}>
              {headerLeading ? <View style={styles.headerLeading}>{headerLeading}</View> : null}
              <Text style={styles.title} numberOfLines={2}>
                {title}
              </Text>
              <Pressable
                onPress={onClose}
                hitSlop={10}
                style={styles.closeBtn}
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <Ionicons name="close" size={22} color={T.text} />
              </Pressable>
            </View>

            {scroll ? (
              <ScrollView
                style={styles.bodyScroll}
                contentContainerStyle={[styles.bodyContent, contentContainerStyle]}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator
                bounces={false}
              >
                {children}
              </ScrollView>
            ) : (
              <View
                style={[
                  styles.bodyFill,
                  bodyMinHeight > 0 ? { minHeight: bodyMinHeight } : null,
                  contentContainerStyle,
                ]}
              >
                {children}
              </View>
            )}

            {footer ? <View style={styles.footer}>{footer}</View> : null}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.45)",
    paddingHorizontal: 16,
  },
  card: {
    flexDirection: "column",
    backgroundColor: T.surface,
    borderRadius: 20,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 24,
      },
      android: { elevation: 12 },
      default: {
        boxShadow: "0 12px 40px rgba(0,0,0,0.2)",
      } as object,
    }),
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
    gap: 8,
  },
  headerLeading: {
    marginRight: 4,
  },
  title: {
    flex: 1,
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 18,
    color: T.text,
    letterSpacing: -0.2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: T.surfaceSubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  bodyScroll: {
    flexGrow: 0,
    flexShrink: 1,
  },
  bodyContent: {
    padding: 20,
    gap: 16,
  },
  bodyFill: {
    flexGrow: 1,
    flexShrink: 1,
    overflow: "hidden",
    minHeight: 0,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: T.border,
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 12,
  },
});
