import React from "react";
import { View, StyleSheet, ViewStyle } from "react-native";
import { useTabBarMetrics } from "@/components/layout/TabBarMetricsContext";

interface ScreenContainerProps {
  children: React.ReactNode;
  style?: ViewStyle;
  /** Extra pixels added on top of the computed tab-bar footprint. Default 12. */
  extraBottomPadding?: number;
  /** Set true for screens rendered outside any tab navigator (e.g. stack modals). */
  disableTabPadding?: boolean;
}

/**
 * Wraps screen content so it is never hidden behind the floating tab bar.
 * Works in both NativeTabs and ClassicTabs contexts — never throws.
 */
export function ScreenContainer({
  children,
  style,
  extraBottomPadding = 12,
  disableTabPadding = false,
}: ScreenContainerProps) {
  const { bottomPadding } = useTabBarMetrics();
  const appliedPadding = disableTabPadding ? 0 : bottomPadding + extraBottomPadding;

  return (
    <View style={[styles.root, style]}>
      <View style={[styles.inner, { paddingBottom: appliedPadding }]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root:  { flex: 1 },
  inner: { flex: 1 },
});
