import React from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  useColorScheme,
  RefreshControl,
  Platform,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";
import { LoadingView } from "@/components/LoadingView";
import { useAuth } from "@/context/AuthContext";

interface Invoice {
  id: string;
  clinicId: string;
  period: string;
  patientCount: number;
  unitPrice: string;
  currency: string;
  total: string;
  status: "DRAFT" | "ISSUED" | "PAID";
  createdAt: string;
}

function InvoiceCard({ invoice, colors }: { invoice: Invoice; colors: any }) {
  const [expanded, setExpanded] = React.useState(false);

  const statusColors = {
    DRAFT: colors.warning,
    ISSUED: colors.accent,
    PAID: colors.success,
  };

  return (
    <Pressable
      onPress={() => setExpanded(!expanded)}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          opacity: pressed ? 0.9 : 1,
        },
      ]}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <View style={[styles.iconWrap, { backgroundColor: statusColors[invoice.status] + "15" }]}>
            <Ionicons name="document-text-outline" size={20} color={statusColors[invoice.status]} />
          </View>
          <View>
            <Text style={[styles.period, { color: colors.text, fontFamily: "PlusJakartaSans_700Bold" }]}>
              {invoice.period}
            </Text>
            <Text style={[styles.date, { color: colors.textSecondary, fontFamily: "PlusJakartaSans_400Regular" }]}>
              Created {new Date(invoice.createdAt).toLocaleDateString()}
            </Text>
          </View>
        </View>
        <StatusBadge status={invoice.status} small />
      </View>

      <View style={styles.cardBody}>
        <View style={styles.metric}>
          <Text style={[styles.metricLabel, { color: colors.textSecondary, fontFamily: "PlusJakartaSans_400Regular" }]}>
            Total
          </Text>
          <Text style={[styles.metricValue, { color: colors.text, fontFamily: "PlusJakartaSans_700Bold" }]}>
            {invoice.total} {invoice.currency}
          </Text>
        </View>
        <Ionicons 
          name={expanded ? "chevron-up" : "chevron-down"} 
          size={16} 
          color={colors.textMuted} 
        />
      </View>

      {expanded && (
        <View style={[styles.expandedContent, { borderTopColor: colors.border }]}>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary, fontFamily: "PlusJakartaSans_400Regular" }]}>
              Patients this month
            </Text>
            <Text style={[styles.detailValue, { color: colors.text, fontFamily: "PlusJakartaSans_600SemiBold" }]}>
              {invoice.patientCount}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary, fontFamily: "PlusJakartaSans_400Regular" }]}>
              Unit Price
            </Text>
            <Text style={[styles.detailValue, { color: colors.text, fontFamily: "PlusJakartaSans_600SemiBold" }]}>
              {invoice.unitPrice} {invoice.currency}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary, fontFamily: "PlusJakartaSans_400Regular" }]}>
              Invoice ID
            </Text>
            <Text style={[styles.detailValue, { color: colors.textMuted, fontSize: 10, fontFamily: "PlusJakartaSans_400Regular" }]}>
              {invoice.id}
            </Text>
          </View>
        </View>
      )}
    </Pressable>
  );
}

export default function InvoicesScreen() {
  const isDark = useColorScheme() === "dark";
  const colors = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const { data, isLoading, refetch, isRefetching } = useQuery<{ rows: Invoice[]; total: number } | Invoice[]>({
    queryKey: ["/v1/manager/invoices"],
  });

  const invoices = Array.isArray(data) ? data : (data as any)?.rows ?? [];

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  if (isLoading) return <LoadingView />;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12 }]}>
        <Text style={[styles.title, { color: colors.text, fontFamily: "PlusJakartaSans_700Bold" }]}>
          Invoices
        </Text>
      </View>

      <FlatList
        data={invoices}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <InvoiceCard invoice={item} colors={colors} />}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + 20 }
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.accent} />
        }
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <EmptyState 
              icon="document-text-outline" 
              title="No invoices found" 
              subtitle="Invoices will appear here once generated for your clinic." 
            />
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
  },
  listContent: {
    padding: 20,
    gap: 12,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  cardHeaderLeft: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  period: {
    fontSize: 16,
  },
  date: {
    fontSize: 12,
    marginTop: 2,
  },
  cardBody: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  metric: {
    gap: 4,
  },
  metricLabel: {
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  metricValue: {
    fontSize: 20,
  },
  expandedContent: {
    marginTop: 4,
    paddingTop: 12,
    borderTopWidth: 1,
    gap: 8,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  detailLabel: {
    fontSize: 13,
  },
  detailValue: {
    fontSize: 13,
  },
  emptyWrap: {
    marginTop: 100,
  },
});
