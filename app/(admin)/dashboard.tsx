import React, { useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Platform,
  RefreshControl,
  FlatList,
  Dimensions,
  ViewToken,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { T, cardShadow, softShadow } from "@/constants/adminTheme";
import { useAuth } from "@/context/AuthContext";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { Card, Divider } from "@/components/ui";
import { getAdminMetrics, AdminMetrics, listAdminInvoices } from "@/lib/api/adminInvoices";
import { apiRequest } from "@/lib/query-client";

const SCREEN_W = Dimensions.get("window").width;

interface AuditEntry {
  id: string;
  action: string;
  actorRole: string;
  clinicId: string | null;
  resourceType: string | null;
  resourceId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function formatAuditAction(entry: AuditEntry): { label: string; icon: keyof typeof Ionicons.glyphMap; color: string } {
  const a = entry.action;
  const meta = entry.metadata ?? {};
  const clinicName = (meta.clinicName as string) ?? (meta.name as string) ?? "Clinic";
  const email = (meta.email as string) ?? "";

  if (a === "CLINIC_CREATED") return { label: `New clinic created: ${clinicName}`, icon: "add-circle-outline", color: T.success };
  if (a === "CLINIC_SUSPENDED") return { label: `Clinic suspended: ${clinicName}`, icon: "ban-outline", color: T.danger };
  if (a === "CLINIC_REACTIVATED" || a === "CLINIC_UPDATED") return { label: `Clinic updated: ${clinicName}`, icon: "refresh-outline", color: T.accent };
  if (a === "INVOICE_MARKED_PAID" || a === "INVOICE_STATUS_UPDATED") return { label: `Invoice marked paid`, icon: "checkmark-done-outline", color: T.success };
  if (a === "INVOICE_GENERATED") return { label: `Invoices generated`, icon: "document-text-outline", color: T.accent };
  if (a === "USER_CREATED") return { label: `New user: ${email}`, icon: "person-add-outline", color: T.primary };
  if (a.includes("LOGIN")) return { label: `Admin signed in`, icon: "log-in-outline", color: T.textSec };
  if (a.includes("PASSWORD")) return { label: `Password changed`, icon: "lock-closed-outline", color: T.warning };
  return { label: a.replace(/_/g, " ").toLowerCase(), icon: "ellipse-outline", color: T.textMuted };
}

interface Slide {
  id: string;
  gradient: readonly [string, string];
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  stats: { label: string; value: number; color: string }[];
  ctaText: string;
  onCta: () => void;
}

function buildSlides(data: AdminMetrics): Slide[] {
  const now = new Date();
  const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  return [
    {
      id: "billing",
      gradient: ["#0A2E50", "#0F4C81"] as const,
      icon: "document-text-outline",
      title: "Billing Overview",
      subtitle: "Invoice status across all clinics",
      stats: [
        { label: "Pending", value: data.invoices.pending, color: "#FBBF24" },
        { label: "Unpaid", value: data.invoices.unpaid, color: "#F87171" },
        { label: "Paid", value: data.invoices.paid, color: "#34D399" },
      ],
      ctaText: data.invoices.unpaid > 0 ? "View Unpaid" : "All Invoices",
      onCta: () => {
        if (data.invoices.unpaid > 0) {
          router.push({ pathname: "/(admin)/invoices", params: { status: "UNPAID" } });
        } else {
          router.push("/(admin)/invoices");
        }
      },
    },
    {
      id: "clinics",
      gradient: ["#0D3B6E", "#0A3D62"] as const,
      icon: "business-outline",
      title: "Clinics Health",
      subtitle: "Platform-wide clinic management",
      stats: [
        { label: "Total", value: data.clinics.total, color: "#93C5FD" },
        { label: "Active", value: data.clinics.active, color: "#34D399" },
        { label: "Suspended", value: data.clinics.suspended, color: "#F87171" },
      ],
      ctaText: data.clinics.suspended > 0 ? "View Suspended" : "All Clinics",
      onCta: () => {
        if (data.clinics.suspended > 0) {
          router.push({ pathname: "/(admin)/clinics", params: { status: "SUSPENDED" } });
        } else {
          router.push("/(admin)/clinics");
        }
      },
    },
    {
      id: "period",
      gradient: ["#062A4E", "#0A3D62"] as const,
      icon: "calendar-outline",
      title: `${currentPeriod} Summary`,
      subtitle: "Current billing period snapshot",
      stats: [
        { label: "Clinics", value: data.clinics.total, color: "#93C5FD" },
        { label: "Users", value: data.users.total, color: "#A5B4FC" },
        { label: "Invoices", value: data.invoices.pending + data.invoices.unpaid + data.invoices.paid, color: "#67E8F9" },
      ],
      ctaText: "View Period",
      onCta: () => router.push({ pathname: "/(admin)/invoices", params: { period: currentPeriod } }),
    },
  ];
}

function SlideCard({ slide, width }: { slide: Slide; width: number }) {
  return (
    <LinearGradient colors={slide.gradient} style={[styles.slide, { width }]}>
      <View style={styles.slideInner}>
        <View style={styles.slideHeader}>
          <View style={styles.slideIconWrap}>
            <Ionicons name={slide.icon} size={18} color="rgba(255,255,255,0.9)" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.slideTitle}>{slide.title}</Text>
            <Text style={styles.slideSub}>{slide.subtitle}</Text>
          </View>
        </View>

        <View style={styles.slideStats}>
          {slide.stats.map((s) => (
            <View key={s.label} style={styles.slideStat}>
              <Text style={[styles.slideStatVal, { color: s.color }]}>{s.value}</Text>
              <Text style={styles.slideStatLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        <Pressable
          style={({ pressed }) => [styles.slideCta, { opacity: pressed ? 0.8 : 1 }]}
          onPress={slide.onCta}
        >
          <Text style={styles.slideCtaText}>{slide.ctaText}</Text>
          <Ionicons name="arrow-forward" size={14} color={T.primary} />
        </Pressable>
      </View>
    </LinearGradient>
  );
}

function BannerSkeleton() {
  return (
    <View style={[styles.slide, { width: SCREEN_W, backgroundColor: "#dde3ec" }]}>
      <ActivityIndicator color={T.accent} style={{ marginTop: 60 }} />
    </View>
  );
}

function KpiSkeleton() {
  return (
    <View style={styles.kpiGrid}>
      {[0, 1, 2, 3].map((i) => (
        <View key={i} style={[styles.kpiCard, { backgroundColor: "#eef0f5" }]} />
      ))}
    </View>
  );
}

function KpiCard({
  label, value, icon, color, sub, onPress,
}: {
  label: string; value: number; icon: keyof typeof Ionicons.glyphMap;
  color: string; sub?: string; onPress?: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.kpiCard, cardShadow, { opacity: pressed ? 0.85 : 1 }]}
      onPress={onPress}
    >
      <View style={[styles.kpiIconWrap, { backgroundColor: color + "18" }]}>
        <Ionicons name={icon} size={17} color={color} />
      </View>
      <Text style={[styles.kpiValue, { color }]}>{value}</Text>
      <Text style={styles.kpiLabel}>{label}</Text>
      {sub && <Text style={styles.kpiSub}>{sub}</Text>}
    </Pressable>
  );
}

function NavRow({ icon, label, sub, color, onPress }: {
  icon: keyof typeof Ionicons.glyphMap; label: string; sub: string; color?: string; onPress: () => void;
}) {
  return (
    <Pressable style={({ pressed }) => [styles.navRow, { opacity: pressed ? 0.7 : 1 }]} onPress={onPress}>
      <View style={[styles.navIcon, { backgroundColor: (color ?? T.primary) + "12" }]}>
        <Ionicons name={icon} size={18} color={color ?? T.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.navLabel}>{label}</Text>
        <Text style={styles.navSub}>{sub}</Text>
      </View>
      <Ionicons name="chevron-forward" size={14} color={T.textMuted} />
    </Pressable>
  );
}

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const bottomPad = Platform.OS === "web" ? 34 : 0;
  const [activeSlide, setActiveSlide] = useState(0);
  const flatRef = useRef<FlatList>(null);

  const { data, isLoading, refetch, isRefetching } = useQuery<AdminMetrics>({
    queryKey: ["/v1/admin/metrics"],
    queryFn: getAdminMetrics,
  });

  const { data: auditData, isLoading: auditLoading } = useQuery<AuditEntry[]>({
    queryKey: ["/v1/admin/audit-logs"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/v1/admin/audit-logs?limit=5");
      return res.json();
    },
  });

  async function handleLogout() {
    await logout();
    router.replace("/(auth)/login");
  }

  const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0 && viewableItems[0].index != null) {
      setActiveSlide(viewableItems[0].index);
    }
  }, []);

  const slides = data ? buildSlides(data) : [];
  const now = new Date();
  const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  return (
    <View style={styles.root}>
      <AdminHeader
        title="Dashboard"
        userEmail={user?.email}
        onLogout={handleLogout}
        showBell
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: bottomPad + 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={T.accent} />
        }
      >
        {/* ── Banner Carousel ─────────────────────────────────── */}
        <View style={styles.carouselWrap}>
          {isLoading ? (
            <BannerSkeleton />
          ) : (
            <FlatList
              ref={flatRef}
              data={slides}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => item.id}
              onViewableItemsChanged={onViewableItemsChanged}
              viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
              renderItem={({ item }) => <SlideCard slide={item} width={SCREEN_W} />}
            />
          )}
          <View style={styles.dots}>
            {(isLoading ? [0, 1, 2] : slides).map((_, i) => (
              <View key={i} style={[styles.dot, i === activeSlide && styles.dotActive]} />
            ))}
          </View>
        </View>

        <View style={styles.body}>
          {/* ── KPI Grid ──────────────────────────────────────── */}
          <Text style={styles.sectionLabel}>OVERVIEW</Text>
          {isLoading ? (
            <KpiSkeleton />
          ) : (
            <View style={styles.kpiGrid}>
              <KpiCard
                label="Suspended"
                value={data?.clinics.suspended ?? 0}
                icon="ban-outline"
                color={T.danger}
                sub="clinics"
                onPress={() => router.push({ pathname: "/(admin)/clinics", params: { status: "SUSPENDED" } })}
              />
              <KpiCard
                label="Unpaid"
                value={data?.invoices.unpaid ?? 0}
                icon="alert-circle-outline"
                color={T.danger}
                sub="invoices"
                onPress={() => router.push({ pathname: "/(admin)/invoices", params: { status: "UNPAID" } })}
              />
              <KpiCard
                label="Pending"
                value={data?.invoices.pending ?? 0}
                icon="time-outline"
                color={T.warning}
                sub="invoices"
                onPress={() => router.push({ pathname: "/(admin)/invoices", params: { status: "PENDING" } })}
              />
              <KpiCard
                label="Paid"
                value={data?.invoices.paid ?? 0}
                icon="checkmark-done-outline"
                color={T.success}
                sub="invoices"
                onPress={() => router.push({ pathname: "/(admin)/invoices", params: { status: "PAID" } })}
              />
            </View>
          )}

          {/* ── Quick Actions ─────────────────────────────────── */}
          <Text style={[styles.sectionLabel, styles.sectionGap]}>QUICK ACTIONS</Text>
          <Card noPad style={softShadow}>
            <NavRow
              icon="add-circle-outline"
              label="Create Clinic"
              sub="Add a new clinic to the platform"
              onPress={() => router.push("/(admin)/clinics/create")}
            />
            <Divider inset={64} />
            <NavRow
              icon="business-outline"
              label="All Clinics"
              sub="Edit, suspend, and view all clinics"
              onPress={() => router.push("/(admin)/clinics")}
            />
            <Divider inset={64} />
            <NavRow
              icon="document-text-outline"
              label="All Invoices"
              sub="Billing history across all clinics"
              onPress={() => router.push("/(admin)/invoices")}
            />
            <Divider inset={64} />
            <NavRow
              icon="people-outline"
              label="Manage Users"
              sub="Managers, admins and accounts"
              onPress={() => router.push("/(admin)/users")}
            />
          </Card>

          {/* ── Activity Feed ─────────────────────────────────── */}
          <Text style={[styles.sectionLabel, styles.sectionGap]}>RECENT ACTIVITY</Text>
          <Card noPad style={softShadow}>
            {auditLoading ? (
              <View style={styles.activityLoader}>
                <ActivityIndicator color={T.accent} />
              </View>
            ) : !auditData || auditData.length === 0 ? (
              <View style={styles.activityEmpty}>
                <Ionicons name="time-outline" size={20} color={T.textMuted} />
                <Text style={styles.activityEmptyText}>No recent activity</Text>
              </View>
            ) : (
              auditData.map((entry, i) => {
                const fmt = formatAuditAction(entry);
                return (
                  <React.Fragment key={entry.id}>
                    {i > 0 && <Divider />}
                    <View style={styles.activityRow}>
                      <View style={[styles.activityIcon, { backgroundColor: fmt.color + "15" }]}>
                        <Ionicons name={fmt.icon} size={15} color={fmt.color} />
                      </View>
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text style={styles.activityLabel} numberOfLines={2}>{fmt.label}</Text>
                        <Text style={styles.activityRole}>{entry.actorRole}</Text>
                      </View>
                      <Text style={styles.activityTime}>{timeAgo(entry.createdAt)}</Text>
                    </View>
                  </React.Fragment>
                );
              })
            )}
          </Card>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  scroll: { flex: 1 },

  carouselWrap: { marginBottom: 4 },
  slide: {
    height: 220,
    justifyContent: "flex-end",
  },
  slideInner: {
    padding: 20,
    gap: 12,
  },
  slideHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  slideIconWrap: {
    width: 34,
    height: 34,
    borderRadius: T.r10,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  slideTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    color: "#fff",
    lineHeight: 22,
  },
  slideSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: "rgba(255,255,255,0.65)",
    marginTop: 2,
  },
  slideStats: {
    flexDirection: "row",
    gap: 20,
  },
  slideStat: {
    alignItems: "flex-start",
    gap: 1,
  },
  slideStatVal: {
    fontFamily: "Inter_700Bold",
    fontSize: 24,
    lineHeight: 28,
  },
  slideStatLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: "rgba(255,255,255,0.6)",
  },
  slideCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    backgroundColor: "#fff",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: T.r20,
  },
  slideCtaText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: T.primary,
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    backgroundColor: T.bg,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: T.border,
  },
  dotActive: {
    width: 18,
    backgroundColor: T.accent,
  },

  body: {
    paddingHorizontal: 16,
    paddingTop: 4,
  },

  sectionLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    color: T.textMuted,
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  sectionGap: { marginTop: 24 },

  kpiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  kpiCard: {
    width: (SCREEN_W - 32 - 10) / 2,
    backgroundColor: T.surface,
    borderRadius: T.r14,
    borderWidth: 1,
    borderColor: T.border,
    padding: 16,
    gap: 6,
  },
  kpiIconWrap: {
    width: 34,
    height: 34,
    borderRadius: T.r10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  kpiValue: {
    fontFamily: "Inter_700Bold",
    fontSize: 28,
    lineHeight: 32,
  },
  kpiLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: T.text,
  },
  kpiSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: T.textMuted,
    marginTop: -2,
  },

  navRow: { flexDirection: "row", alignItems: "center", padding: 14, gap: 12 },
  navIcon: { width: 38, height: 38, borderRadius: T.r10, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  navLabel: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: T.text },
  navSub: { fontFamily: "Inter_400Regular", fontSize: 12, color: T.textMuted, marginTop: 1 },

  activityLoader: { padding: 24, alignItems: "center" },
  activityEmpty: { padding: 24, alignItems: "center", gap: 8, flexDirection: "row", justifyContent: "center" },
  activityEmptyText: { fontFamily: "Inter_400Regular", fontSize: 14, color: T.textMuted },
  activityRow: { flexDirection: "row", alignItems: "flex-start", padding: 14, gap: 12 },
  activityIcon: { width: 32, height: 32, borderRadius: T.r8, alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 },
  activityLabel: { fontFamily: "Inter_500Medium", fontSize: 13.5, color: T.text, lineHeight: 18 },
  activityRole: { fontFamily: "Inter_400Regular", fontSize: 11, color: T.textMuted, textTransform: "capitalize" },
  activityTime: { fontFamily: "Inter_400Regular", fontSize: 11, color: T.textMuted, flexShrink: 0, marginTop: 2 },
});
