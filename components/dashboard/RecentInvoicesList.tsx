import React from "react";
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { T, softShadow } from "@/constants/adminTheme";
import { Card, Divider, StatusPill } from "@/components/ui";
import type { RecentInvoiceDto } from "@/lib/api/adminDashboard";

function formatTotal(total: number, currency: string): string {
  return `${currency} ${total.toLocaleString()}`;
}

interface InvoiceRowProps {
  invoice: RecentInvoiceDto;
  showDivider: boolean;
}

function InvoiceRow({ invoice, showDivider }: InvoiceRowProps) {
  return (
    <>
      {showDivider && <Divider />}
      <Pressable
        style={({ pressed }) => [styles.row, { opacity: pressed ? 0.7 : 1 }]}
        onPress={() => router.push(`/(admin)/invoices/${invoice.id}`)}
      >
        <View style={styles.iconWrap}>
          <Ionicons name="document-text-outline" size={16} color={T.accent} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={styles.clinicName} numberOfLines={1}>
            {invoice.clinicName}
          </Text>
          <Text style={styles.period}>{invoice.period}</Text>
        </View>
        <View style={styles.right}>
          <Text style={styles.total}>{formatTotal(invoice.total, invoice.currency)}</Text>
          <StatusPill status={invoice.status as any} small />
        </View>
      </Pressable>
    </>
  );
}

function EmptyInvoices() {
  return (
    <View style={styles.empty}>
      <Ionicons name="receipt-outline" size={18} color={T.textMuted} />
      <Text style={styles.emptyText}>No invoices yet</Text>
    </View>
  );
}

interface Props {
  invoices: RecentInvoiceDto[] | undefined;
  isLoading: boolean;
}

export function RecentInvoicesList({ invoices, isLoading }: Props) {
  return (
    <Card noPad style={softShadow}>
      {isLoading ? (
        <View style={styles.loader}>
          <ActivityIndicator color={T.accent} />
        </View>
      ) : !invoices || invoices.length === 0 ? (
        <EmptyInvoices />
      ) : (
        invoices.map((inv, i) => (
          <InvoiceRow key={inv.id} invoice={inv} showDivider={i > 0} />
        ))
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  loader: { padding: 24, alignItems: "center" },
  empty: {
    padding: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  emptyText: { fontFamily: "PlusJakartaSans_400Regular", fontSize: 14, color: T.textMuted },
  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 12,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: T.r10,
    backgroundColor: T.accent + "12",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  clinicName: { fontFamily: "PlusJakartaSans_600SemiBold", fontSize: 14, color: T.text },
  period: { fontFamily: "PlusJakartaSans_400Regular", fontSize: 12, color: T.textMuted },
  right: { alignItems: "flex-end", gap: 4 },
  total: { fontFamily: "PlusJakartaSans_600SemiBold", fontSize: 13, color: T.text },
});
