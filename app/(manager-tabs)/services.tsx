import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { T, cardShadow } from "@/constants/adminTheme";
import { ManagerHeader } from "@/components/manager/ManagerHeader";
import { useAuth } from "@/context/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { useT } from "@/hooks/useT";

interface ClinicInfo {
  id: string;
  name: string;
  status: string;
}

interface ServiceCard {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  description: string;
  color: string;
  route: string;
}

export default function ServicesScreen() {
  const { logout } = useAuth();
  const t = useT();
  const ts = t.managerServices;
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  const { data: clinic } = useQuery<ClinicInfo>({
    queryKey: ["/v1/manager/clinic-info"],
  });

  async function handleLogout() {
    await logout();
    router.replace("/(auth)/login");
  }

  const SERVICES: ServiceCard[] = [
    {
      icon: "people-outline",
      label: ts.svcDoctorsLabel,
      description: ts.svcDoctorsDesc,
      color: "#6366F1",
      route: "/(manager)/doctors",
    },
    {
      icon: "bed-outline",
      label: ts.svcHotelsLabel,
      description: ts.svcHotelsDesc,
      color: "#0369A1",
      route: "/(manager)/hotels",
    },
    {
      icon: "car-outline",
      label: ts.svcTransportsLabel,
      description: ts.svcTransportsDesc,
      color: "#059669",
      route: "/(manager)/transports",
    },
    {
      icon: "document-attach-outline",
      label: ts.svcDocTypesLabel,
      description: ts.svcDocTypesDesc,
      color: "#D97706",
      route: "/(manager)/document-types",
    },
  ];

  return (
    <View style={styles.root}>
      <ManagerHeader title={ts.pageTitle} subtitle={clinic?.name} onLogout={handleLogout} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.intro}>{ts.intro}</Text>
        <View style={styles.grid}>
          {SERVICES.map((svc) => (
            <Pressable
              key={svc.label}
              style={({ pressed }) => [styles.card, cardShadow, { opacity: pressed ? 0.82 : 1 }]}
              onPress={() => router.push(svc.route as any)}
            >
              <View style={[styles.iconWrap, { backgroundColor: svc.color + "18" }]}>
                <Ionicons name={svc.icon} size={28} color={svc.color} />
              </View>
              <Text style={styles.cardLabel}>{svc.label}</Text>
              <Text style={styles.cardDesc}>{svc.description}</Text>
              <View style={styles.cardArrow}>
                <Ionicons name="arrow-forward" size={14} color={svc.color} />
              </View>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  scroll: { flex: 1 },
  content: { padding: T.sp16, gap: T.sp16 },
  intro: {
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 14,
    color: T.textMuted,
    lineHeight: 20,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: T.sp12 as number,
  },
  card: {
    width: "48%" as any,
    backgroundColor: T.surface,
    borderRadius: T.r16,
    padding: T.sp20,
    gap: T.sp8,
    borderWidth: 1,
    borderColor: T.border,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: T.r14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: T.sp4,
  },
  cardLabel: {
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 15,
    color: T.text,
  },
  cardDesc: {
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 12,
    color: T.textMuted,
    lineHeight: 16,
  },
  cardArrow: {
    marginTop: T.sp4,
  },
});
