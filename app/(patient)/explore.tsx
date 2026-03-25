import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  Linking,
} from "react-native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { GuestHeader } from "@/components/guest/GuestHeader";
import { useGuestDashboard } from "@/hooks/guest/useGuestDashboard";
import { T, cardShadow } from "@/constants/adminTheme";

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
  icon: string;
  iconColor?: string;
  iconBg?: string;
  title: string;
  subtitle?: string;
  action?: { label: string; onPress: () => void };
}

function InfoCard({ icon, iconColor = T.accent, iconBg = "#EFF6FF", title, subtitle, action }: InfoCardProps) {
  return (
    <View style={[styles.card, cardShadow]}>
      <View style={styles.cardRow}>
        <View style={[styles.iconCircle, { backgroundColor: iconBg }]}>
          <Ionicons name={icon as any} size={22} color={iconColor} />
        </View>
        <View style={styles.cardText}>
          <Text style={styles.cardTitle}>{title}</Text>
          {subtitle ? <Text style={styles.cardSubtitle} numberOfLines={2}>{subtitle}</Text> : null}
        </View>
      </View>
      {action ? (
        <Pressable style={styles.actionBtn} onPress={action.onPress}>
          <Text style={styles.actionBtnText}>{action.label}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function FaqCard() {
  const [open, setOpen] = React.useState<number | null>(null);
  return (
    <View style={[styles.card, cardShadow]}>
      <View style={styles.faqHeader}>
        <View style={[styles.iconCircle, { backgroundColor: "#FFF7ED" }]}>
          <Ionicons name="help-circle-outline" size={22} color={T.warning} />
        </View>
        <Text style={styles.cardTitle}>Frequently Asked Questions</Text>
      </View>
      {FAQ_ITEMS.map((item, i) => (
        <View key={i} style={styles.faqItem}>
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

export default function ExploreScreen() {
  const tabBarHeight = useBottomTabBarHeight();
  const { patient, transport, hotel, appointments } = useGuestDashboard();

  const nextAppt = appointments.find((a) => a.status === "SCHEDULED");
  const clinicPhone = patient?.phone ?? null;
  const topPadWeb = Platform.OS === "web" ? 67 : 0;

  function callClinic() {
    if (clinicPhone) Linking.openURL(`tel:${clinicPhone}`);
  }

  const planLines: string[] = [];
  if (transport?.driverName) planLines.push(`Driver: ${transport.driverName}`);
  if (hotel?.name) planLines.push(`Hotel: ${hotel.name}${hotel.roomNo ? ` · Rm ${hotel.roomNo}` : ""}`);
  if (nextAppt) planLines.push(`Next: ${nextAppt.title}`);

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
          subtitle={planLines.length > 0 ? planLines.join("\n") : "Your transport, hotel, and appointments will appear here."}
        />

        <SectionTitle text="Contact" />
        <InfoCard
          icon="call-outline"
          iconColor={T.accent}
          iconBg="#EFF6FF"
          title="Contact the Clinic"
          subtitle={clinicPhone ? `Call us at ${clinicPhone}` : "Your clinic contact info will appear here."}
          action={
            clinicPhone
              ? { label: "Call Now", onPress: callClinic }
              : undefined
          }
        />

        <SectionTitle text="FAQ" />
        <FaqCard />

        <SectionTitle text="Language" />
        <InfoCard
          icon="language-outline"
          iconColor="#7C3AED"
          iconBg="#F5F3FF"
          title="Translation (Coming Soon)"
          subtitle="In-app translation support will be available in a future update."
        />
      </ScrollView>
    </View>
  );
}

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
    fontSize: 12,
    color: T.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.7,
    marginTop: T.sp8,
    marginBottom: 2,
    marginLeft: 2,
  },
  card: {
    backgroundColor: T.surface,
    borderRadius: T.r12,
    padding: T.sp16,
    gap: T.sp12,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: T.sp12,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  cardText: {
    flex: 1,
    gap: 3,
  },
  cardTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: T.text,
  },
  cardSubtitle: {
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
    marginTop: 4,
  },
  actionBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: "#fff",
  },
  faqHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: T.sp12,
  },
  faqItem: {
    gap: T.sp8,
  },
  faqQuestion: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: T.sp8,
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
  },
  faqDivider: {
    height: 1,
    backgroundColor: T.border,
  },
});
