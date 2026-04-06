import React, { useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  Linking,
  Animated,
  Dimensions,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { BlurView } from "expo-blur";
import { useTabBarMetrics } from "@/components/layout/TabBarMetricsContext";
import { Ionicons } from "@expo/vector-icons";
import { GuestHeader } from "@/components/guest/GuestHeader";
import { useGuestDashboard } from "@/hooks/guest/useGuestDashboard";
import { T, cardShadow, softShadow } from "@/constants/adminTheme";

const SCREEN_HEIGHT = Dimensions.get("window").height;

// ─── Coming Soon overlay ──────────────────────────────────────────────────────

const FEATURES: { icon: React.ComponentProps<typeof Ionicons>["name"]; label: string; desc: string }[] = [
  { icon: "sparkles-outline",     label: "Premium Hammam & Spa",         desc: "Curated thermal and traditional treatments" },
  { icon: "leaf-outline",         label: "Wellness Experiences",         desc: "Private sessions, meditation, and recovery" },
  { icon: "map-outline",          label: "Private & Group Tours",        desc: "Guided city walks, day trips, and excursions" },
  { icon: "calendar-outline",     label: "Priority Reservations",        desc: "Skip the queue at top restaurants and venues" },
  { icon: "diamond-outline",      label: "Exclusive Concierge Add-ons",  desc: "Tailored services arranged just for you" },
  { icon: "gift-outline",         label: "Curated Local Experiences",    desc: "Handpicked cultural and leisure activities" },
];

function ComingSoonOverlay({ visible, onDismiss }: { visible: boolean; onDismiss: () => void }) {
  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(60)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fade, { toValue: 1, duration: 260, useNativeDriver: true }),
        Animated.spring(slide, { toValue: 0, damping: 22, stiffness: 180, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fade, { toValue: 0, duration: 180, useNativeDriver: true }),
        Animated.timing(slide, { toValue: 60, duration: 180, useNativeDriver: true }),
      ]).start();
    }
  }, [visible, fade, slide]);

  if (!visible) return null;

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.overlayWrap, { opacity: fade }]}>
      {Platform.OS === "ios" ? (
        <BlurView intensity={28} tint="dark" style={StyleSheet.absoluteFill} />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.overlayBg]} />
      )}

      <Animated.View style={[styles.card, softShadow, { transform: [{ translateY: slide }] }]}>
        {/* Close */}
        <Pressable
          style={({ pressed }) => [styles.closeBtn, { opacity: pressed ? 0.6 : 1 }]}
          onPress={onDismiss}
          hitSlop={12}
          accessibilityLabel="Close"
          accessibilityRole="button"
        >
          <Ionicons name="close" size={20} color={T.textSec} />
        </Pressable>

        {/* Header */}
        <View style={styles.cardHeader}>
          <View style={styles.accentPill}>
            <Text style={styles.accentPillText}>Coming Soon</Text>
          </View>
          <Text style={styles.cardTitle}>Curated Premium{"\n"}Experiences</Text>
          <Text style={styles.cardTagline}>
            Soon you will be able to enrich your stay with thoughtfully
            arranged services — from wellness to culture.
          </Text>
        </View>

        {/* Feature list */}
        <View style={styles.featureList}>
          {FEATURES.map((f) => (
            <View key={f.label} style={styles.featureRow}>
              <View style={styles.featureIcon}>
                <Ionicons name={f.icon} size={18} color={T.accent} />
              </View>
              <View style={styles.featureText}>
                <Text style={styles.featureLabel}>{f.label}</Text>
                <Text style={styles.featureDesc}>{f.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Footer note */}
        <Text style={styles.footerNote}>
          These services are being carefully prepared for you.{"\n"}Stay tuned.
        </Text>
      </Animated.View>
    </Animated.View>
  );
}

// ─── Underlying content ───────────────────────────────────────────────────────

const FAQ_ITEMS = [
  {
    q: "What should I bring on arrival day?",
    a: "Your passport or ID, any existing medical reports, and a list of current medications.",
  },
  {
    q: "Who do I contact if I feel unwell?",
    a: "Call your assigned driver or contact the clinic directly using the number on your Profile.",
  },
  {
    q: "Can I change my hotel room?",
    a: "Requests go through the clinic coordinator. Contact them at least 48 hours in advance.",
  },
  {
    q: "Are meals included at the hotel?",
    a: "This depends on your package. Check your welcome letter or ask the clinic coordinator.",
  },
];

function SectionTitle({ text }: { text: string }) {
  return <Text style={styles.sectionTitle}>{text}</Text>;
}

interface InfoCardProps {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  iconColor?: string;
  iconBg?: string;
  title: string;
  subtitle?: string;
  action?: { label: string; onPress: () => void };
}

function InfoCard({ icon, iconColor = T.accent, iconBg = "#EFF6FF", title, subtitle, action }: InfoCardProps) {
  return (
    <View style={[styles.infoCard, cardShadow]}>
      <View style={styles.cardRow}>
        <View style={[styles.iconCircle, { backgroundColor: iconBg }]}>
          <Ionicons name={icon} size={22} color={iconColor} />
        </View>
        <View style={styles.cardText}>
          <Text style={styles.infoCardTitle}>{title}</Text>
          {subtitle ? <Text style={styles.infoCardSubtitle} numberOfLines={3}>{subtitle}</Text> : null}
        </View>
      </View>
      {action ? (
        <Pressable
          style={({ pressed }) => [styles.actionBtn, { opacity: pressed ? 0.8 : 1 }]}
          onPress={action.onPress}
        >
          <Text style={styles.actionBtnText}>{action.label}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function FaqCard() {
  const [open, setOpen] = React.useState<number | null>(null);
  return (
    <View style={[styles.infoCard, cardShadow]}>
      <View style={styles.cardRow}>
        <View style={[styles.iconCircle, { backgroundColor: "#FFF7ED" }]}>
          <Ionicons name="help-circle-outline" size={22} color={T.warning} />
        </View>
        <Text style={styles.infoCardTitle}>Frequently Asked Questions</Text>
      </View>
      {FAQ_ITEMS.map((item, i) => (
        <View key={i}>
          <Pressable style={styles.faqQuestion} onPress={() => setOpen(open === i ? null : i)}>
            <Text style={styles.faqQText}>{item.q}</Text>
            <Ionicons
              name={open === i ? "chevron-up" : "chevron-down"}
              size={16}
              color={T.textMuted}
            />
          </Pressable>
          {open === i ? <Text style={styles.faqAText}>{item.a}</Text> : null}
          {i < FAQ_ITEMS.length - 1 ? <View style={styles.faqDivider} /> : null}
        </View>
      ))}
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function ExploreScreen() {
  const { bottomPadding: tabBarHeight } = useTabBarMetrics();
  const { patient, transport, hotel, appointments } = useGuestDashboard();
  const [showComingSoon, setShowComingSoon] = React.useState(true);

  useFocusEffect(
    useCallback(() => {
      setShowComingSoon(true);
    }, []),
  );

  const nextAppt = appointments.find((a) => a.status === "SCHEDULED");
  const clinicPhone = patient?.phone ?? null;
  const topPadWeb = Platform.OS === "web" ? 67 : 0;

  const planLines: string[] = [];
  if (transport?.driverName) planLines.push(`Driver: ${transport.driverName}`);
  if (hotel?.name) planLines.push(`Hotel: ${hotel.name}${hotel.roomNo ? ` · Rm ${hotel.roomNo}` : ""}`);
  if (nextAppt) planLines.push(`Next: ${nextAppt.title}`);

  function callClinic() {
    if (clinicPhone) Linking.openURL(`tel:${clinicPhone}`);
  }

  return (
    <View style={[styles.root, { paddingTop: topPadWeb }]}>
      <GuestHeader title="Explore" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: tabBarHeight + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <SectionTitle text="Your Plan" />
        <InfoCard
          icon="map-outline"
          iconColor="#059669"
          iconBg="#ECFDF5"
          title={planLines.length > 0 ? "Active Arrangements" : "No plan assigned yet"}
          subtitle={
            planLines.length > 0
              ? planLines.join("\n")
              : "Your transport, hotel, and appointments will appear here."
          }
        />

        <SectionTitle text="Contact" />
        <InfoCard
          icon="call-outline"
          iconColor={T.accent}
          iconBg="#EFF6FF"
          title="Contact the Clinic"
          subtitle={
            clinicPhone
              ? `Call us at ${clinicPhone}`
              : "Your clinic contact info will appear here."
          }
          action={clinicPhone ? { label: "Call Now", onPress: callClinic } : undefined}
        />

        <SectionTitle text="FAQ" />
        <FaqCard />
      </ScrollView>

      <ComingSoonOverlay
        visible={showComingSoon}
        onDismiss={() => setShowComingSoon(false)}
      />
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
    flex: 1,
  },
  content: {
    padding: T.sp16,
    gap: T.sp8,
  },
  sectionTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 11,
    color: T.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginTop: T.sp8,
    marginBottom: 2,
    marginLeft: 2,
  },

  // ── Info cards ──────────────────────────────────────────────────────────────
  infoCard: {
    backgroundColor: T.surface,
    borderRadius: T.r12,
    padding: T.sp16,
    gap: T.sp12,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: T.sp12,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  cardText: { flex: 1, gap: 3 },
  infoCardTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: T.text,
  },
  infoCardSubtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: T.textSec,
    lineHeight: 18,
  },
  actionBtn: {
    alignSelf: "flex-start",
    backgroundColor: T.accent,
    borderRadius: T.r8,
    paddingHorizontal: T.sp16,
    paddingVertical: T.sp8,
    marginTop: 2,
  },
  actionBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: "#fff",
  },
  faqQuestion: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: T.sp8,
    paddingVertical: 4,
  },
  faqQText: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: T.text,
    flex: 1,
    lineHeight: 20,
  },
  faqAText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: T.textSec,
    lineHeight: 19,
    paddingLeft: 2,
    paddingBottom: 6,
  },
  faqDivider: {
    height: 1,
    backgroundColor: T.border,
    marginVertical: 2,
  },

  // ── Coming Soon overlay ─────────────────────────────────────────────────────
  overlayWrap: {
    zIndex: 100,
    justifyContent: "flex-end",
  },
  overlayBg: {
    backgroundColor: "rgba(10, 20, 40, 0.62)",
  },
  card: {
    backgroundColor: T.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 40,
    gap: 24,
    maxHeight: SCREEN_HEIGHT * 0.84,
  },
  closeBtn: {
    position: "absolute",
    top: 20,
    right: 20,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: T.surfaceSubtle,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  cardHeader: {
    gap: 10,
    paddingRight: 40,
  },
  accentPill: {
    alignSelf: "flex-start",
    backgroundColor: "#EFF6FF",
    borderRadius: 100,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  accentPillText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    color: T.accent,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  cardTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 26,
    color: T.text,
    lineHeight: 32,
    letterSpacing: -0.5,
  },
  cardTagline: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: T.textSec,
    lineHeight: 21,
  },
  featureList: {
    gap: 16,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
  },
  featureIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: 1,
  },
  featureText: {
    flex: 1,
    gap: 2,
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
  footerNote: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: T.textMuted,
    textAlign: "center",
    lineHeight: 18,
  },
});
