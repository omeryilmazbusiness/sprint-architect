import React from "react";
import { Text, StyleSheet } from "react-native";
import { T } from "@/constants/adminTheme";

export function SectionLabel({ text }: { text: string }) {
  return <Text style={styles.label}>{text}</Text>;
}

const styles = StyleSheet.create({
  label: {
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 18,
    color: T.text,
    marginBottom: T.sp12,
    letterSpacing: -0.3,
  },
});
