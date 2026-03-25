import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated, Platform } from "react-native";
import { T } from "@/constants/adminTheme";

function Shimmer({ style }: { style: object }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 900, useNativeDriver: false }),
        Animated.timing(anim, { toValue: 0, duration: 900, useNativeDriver: false }),
      ])
    ).start();
  }, []);

  const bg = anim.interpolate({
    inputRange: [0, 1],
    outputRange: ["#E9ECF0", "#F4F6F9"],
  });

  return <Animated.View style={[{ backgroundColor: bg, borderRadius: 8 }, style]} />;
}

function SkeletonCard({ height = 100 }: { height?: number }) {
  return (
    <View style={[styles.card]}>
      <Shimmer style={{ width: "40%", height: 12, marginBottom: 14 }} />
      <Shimmer style={{ width: "80%", height: 20, marginBottom: 10 }} />
      <Shimmer style={{ width: "60%", height: 14 }} />
      {height > 100 && (
        <Shimmer style={{ width: "90%", height: 14, marginTop: 10 }} />
      )}
    </View>
  );
}

export function GuestDashboardSkeleton() {
  return (
    <View style={styles.root}>
      {/* Header skeleton */}
      <View style={styles.header}>
        <View>
          <Shimmer style={{ width: 100, height: 11, marginBottom: 8 }} />
          <Shimmer style={{ width: 160, height: 22 }} />
        </View>
        <Shimmer style={{ width: 38, height: 38, borderRadius: 19 }} />
      </View>

      {/* Banner skeleton */}
      <View style={styles.bannerWrap}>
        <Shimmer style={{ width: "100%", height: 200, borderRadius: 20 }} />
      </View>

      {/* Cards skeleton */}
      <View style={styles.section}>
        {/* Black transport card */}
        <View style={[styles.card, { backgroundColor: "#1A1F2E", borderColor: "#2A2F3E" }]}>
          <Shimmer style={{ width: "35%", height: 12, marginBottom: 14 }} />
          <Shimmer style={{ width: "70%", height: 28, marginBottom: 8 }} />
          <Shimmer style={{ width: "50%", height: 14, marginBottom: 16 }} />
          <Shimmer style={{ width: "100%", height: 42, borderRadius: 10 }} />
        </View>
        <SkeletonCard height={120} />
        <SkeletonCard />
        <SkeletonCard />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: T.bg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: T.sp16,
    paddingTop: Platform.OS === "web" ? 80 : 60,
    paddingBottom: T.sp16,
    backgroundColor: T.surface,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
    marginBottom: T.sp16,
  },
  bannerWrap: {
    marginHorizontal: T.sp16,
    marginBottom: T.sp16,
  },
  section: {
    paddingHorizontal: T.sp16,
    gap: T.sp12,
  },
  card: {
    backgroundColor: T.surface,
    borderRadius: T.r16,
    borderWidth: 1,
    borderColor: T.border,
    padding: T.sp16,
  },
});
