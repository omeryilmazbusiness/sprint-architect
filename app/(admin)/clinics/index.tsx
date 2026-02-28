import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  TextInput,
  useColorScheme,
  Platform,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import Colors from "@/constants/colors";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";
import { LoadingView } from "@/components/LoadingView";
import { ErrorView } from "@/components/ErrorView";
import { listClinics, ClinicListResponse } from "@/lib/api/adminClinics";

export default function ClinicsScreen() {
  const isDark = useColorScheme() === "dark";
  const colors = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [debounceTimer, setDebounceTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  function handleSearchChange(text: string) {
    setSearch(text);
    if (debounceTimer) clearTimeout(debounceTimer);
    const t = setTimeout(() => setDebouncedSearch(text), 300);
    setDebounceTimer(t);
  }

  const { data, isLoading, isError, refetch, isRefetching } = useQuery<ClinicListResponse>({
    queryKey: ["/v1/admin/clinics", debouncedSearch],
    queryFn: () => listClinics({ search: debouncedSearch || undefined }),
  });

  if (isLoading) return <LoadingView message="Loading clinics..." />;
  if (isError) return <ErrorView onRetry={refetch} />;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          { paddingTop: topPad + 12, backgroundColor: colors.card, borderBottomColor: colors.border },
        ]}
      >
        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: colors.text, fontFamily: "Inter_700Bold" }]}>Clinics</Text>
          <Pressable
            testID="create-clinic-btn"
            style={[styles.headerBtn, { backgroundColor: colors.accent }]}
            onPress={() => router.push("/(admin)/clinics/create")}
          >
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={[styles.headerBtnText, { fontFamily: "Inter_600SemiBold" }]}>New</Text>
          </Pressable>
        </View>
        <TextInput
          style={[
            styles.searchInput,
            { backgroundColor: colors.background, borderColor: colors.border, color: colors.text, fontFamily: "Inter_400Regular" },
          ]}
          placeholder="Search clinics..."
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={handleSearchChange}
          returnKeyType="search"
        />
      </View>

      <FlatList
        data={data?.rows ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.list, { paddingBottom: bottomPad + 100 }]}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.accent} />
        }
        scrollEnabled={!!(data?.rows?.length)}
        ListEmptyComponent={
          <EmptyState
            icon="business-outline"
            title="No clinics yet"
            subtitle="Tap New to create your first clinic"
          />
        }
        renderItem={({ item }) => (
          <Pressable
            style={({ pressed }) => [
              styles.card,
              { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.85 : 1 },
            ]}
            onPress={() => router.push({ pathname: "/(admin)/clinics/[id]", params: { id: item.id } })}
          >
            <View style={styles.cardTop}>
              <View style={[styles.cardIcon, { backgroundColor: colors.accent + "18" }]}>
                <Ionicons name="business-outline" size={16} color={colors.accent} />
              </View>
              <Text
                style={[styles.cardName, { color: colors.text, fontFamily: "Inter_600SemiBold" }]}
                numberOfLines={1}
              >
                {item.name}
              </Text>
              <StatusBadge status={item.status as any} small />
            </View>

            {(item.services?.length > 0 || item.contactEmail || item.contactPhone) && (
              <View style={styles.cardDetails}>
                {item.contactEmail ? (
                  <View style={styles.metaItem}>
                    <Ionicons name="mail-outline" size={12} color={colors.textMuted} />
                    <Text style={[styles.metaText, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>
                      {item.contactEmail}
                    </Text>
                  </View>
                ) : null}
                {item.contactPhone ? (
                  <View style={styles.metaItem}>
                    <Ionicons name="call-outline" size={12} color={colors.textMuted} />
                    <Text style={[styles.metaText, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>
                      {item.contactPhone}
                    </Text>
                  </View>
                ) : null}
                {item.services?.length > 0 ? (
                  <View style={styles.metaItem}>
                    <Ionicons name="medical-outline" size={12} color={colors.textMuted} />
                    <Text style={[styles.metaText, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>
                      {item.services.join(", ")}
                    </Text>
                  </View>
                ) : null}
              </View>
            )}

            <View style={styles.cardFooter}>
              <View style={styles.metaItem}>
                <Ionicons name="card-outline" size={12} color={colors.textMuted} />
                <Text style={[styles.metaText, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>
                  {item.currency}
                  {item.billingUnitPrice != null ? ` · ${item.billingUnitPrice}` : " · default rate"}
                </Text>
              </View>
              <View style={styles.metaItem}>
                <Ionicons name="calendar-outline" size={12} color={colors.textMuted} />
                <Text style={[styles.metaText, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>
                  Day {item.billingAnchorDay}
                </Text>
              </View>
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  title: { fontSize: 26 },
  headerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
  },
  headerBtnText: { fontSize: 14, color: "#fff" },
  searchInput: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
  },
  list: { padding: 16, gap: 10 },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 8,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  cardIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  cardName: { flex: 1, fontSize: 15 },
  cardDetails: { gap: 4, paddingLeft: 40 },
  cardFooter: { flexDirection: "row", gap: 14, paddingLeft: 40 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  metaText: { fontSize: 12 },
});
