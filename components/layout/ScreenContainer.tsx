import React from "react";
import { View, StyleSheet, ViewStyle } from "react-native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";

interface ScreenContainerProps {
  children: React.ReactNode;
  style?: ViewStyle;
  extraBottomPadding?: number;
}

/**
 * Wraps screen content so it is never hidden behind the floating tab bar.
 * Uses useBottomTabBarHeight() — works in both the Classic (patient) and
 * manager tab layouts.  Supply extraBottomPadding for screens that need
 * additional breathing room below the last item (default 12).
 */
export function ScreenContainer({
  children,
  style,
  extraBottomPadding = 12,
}: ScreenContainerProps) {
  const tabBarHeight = useBottomTabBarHeight();

  return (
    <View style={[styles.root, style]}>
      <View style={[styles.inner, { paddingBottom: tabBarHeight + extraBottomPadding }]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root:  { flex: 1 },
  inner: { flex: 1 },
});
