import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTabBarMetrics } from "@/components/layout/TabBarMetricsContext";
import { T, cardShadow } from "@/constants/adminTheme";

// ─── Feature definition ───────────────────────────────────────────────────────

const FEATURES: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  desc: string;
}[] = [
  {
    icon: "sparkles-outline",
    label: "Premium Hammam & Spa",
    desc: "Curated thermal baths and traditional wellness treatments",
  },
  {
    icon: "leaf-outline",
    label: "Private Wellness Experiences",
    desc: "One-on-one sessions, meditation, and recovery therapies",
  },
  {
    icon: "map-outline",
    label: "Curated Tours",
    desc: "Guided city walks, cultural day trips, and scenic excursions",
  },
  {
    icon: "calendar-outline",
    label: "Priority Reservations",
    desc: "First access to top restaurants, venues, and events",
  },
  {
    icon: "diamond-outline",
    label: "Concierge Add-ons",
    desc: "Personalised services arranged exclusively for you",
  },
  {
    icon: "gift-outline",
    label: "Exclusive Guest Services",
    desc: "Handpicked offerings reserved for our medical guests",
  },
];

// ─── Feature row ──────────────────────────────────────────────────────────────

function FeatureRow({
  icon,
  label,
  desc,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  desc: string;
}) {
  return (
    <View style={styles.featureRow}>
      <View style={styles.featureIcon}>
        <Ionicons name={icon} size={19} color={T.accent} />
      </View>
      <View style={styles.featureText}>
        <Text style={styles.featureLabel}>{label}</Text>
        <Text style={styles.featureDesc}>{desc}</Text>
      </View>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ExploreScreen() {
  const insets = useSafeAreaInsets();
  const { bottomPadding: tabBarHeight } = useTabBarMetrics();

  const topPad = Platform.OS === "web"
    ? Math.max(insets.top, 67)
    : insets.top;

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          {
            paddingTop: topPad + 24,
            paddingBottom: tabBarHeight + 32,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero ── */}
        <View style={styles.hero}>
          <View style={styles.heroIconWrap}>
            <Ionicons name="compass-outline" size={38} color={T.accent} />
          </View>

          <View style={styles.pill}>
            <Text style={styles.pillText}>Coming Soon</Text>
          </View>

          <Text style={styles.heroTitle}>
            Curated Premium{"\n"}Experiences
          </Text>

          <Text style={styles.heroTagline}>
            Soon you will be able to enhance your medical journey with
            thoughtfully arranged services — from wellness and culture
            to concierge-level care.
          </Text>
        </View>

        {/* ── Feature card ── */}
        <View style={[styles.card, cardShadow]}>
          <Text style={styles.cardLabel}>What's Coming</Text>
          <View style={styles.featureList}>
            {FEATURES.map((f, i) => (
              <React.Fragment key={f.label}>
                <FeatureRow icon={f.icon} label={f.label} desc={f.desc} />
                {i < FEATURES.length - 1 ? (
                  <View style={styles.divider} />
                ) : null}
              </React.Fragment>
            ))}
          </View>
        </View>

        {/* ── Footer note ── */}
        <Text style={styles.footerNote}>
          These services are being thoughtfully prepared for you.{"\n"}
          Stay tuned for updates.
        </Text>
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: T.bg,
  },
  scroll: {
    paddingHorizontal: T.sp16,
    gap: T.sp20,
  },

  // Hero
  hero: {
    alignItems: "center",
    paddingHorizontal: T.sp16,
    gap: T.sp12,
  },
  heroIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
    ...Platform.select({
      ios: {
        shadowColor: T.accent,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.14,
        shadowRadius: 14,
      },
      android: { elevation: 4 },
      default: {},
    }),
  },
  pill: {
    backgroundColor: "#DBEAFE",
    borderRadius: 100,
    paddingHorizontal: 14,
    paddingVertical: 5,
  },
  pillText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    color: T.accent,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  heroTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 30,
    color: T.text,
    textAlign: "center",
    lineHeight: 37,
    letterSpacing: -0.6,
  },
  heroTagline: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: T.textSec,
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 320,
  },

  // Feature card
  card: {
    backgroundColor: T.surface,
    borderRadius: 20,
    padding: T.sp20,
    gap: T.sp16,
  },
  cardLabel: {
    fontFamily: "Inter_700Bold",
    fontSize: 11,
    color: T.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  featureList: {
    gap: 0,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
    paddingVertical: 14,
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  featureText: {
    flex: 1,
    gap: 3,
    justifyContent: "center",
  },
  featureLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: T.text,
  },
  featureDesc: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: T.textSec,
    lineHeight: 17,
  },
  divider: {
    height: 1,
    backgroundColor: T.border,
  },

  // Footer
  footerNote: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: T.textMuted,
    textAlign: "center",
    lineHeight: 19,
  },
});
