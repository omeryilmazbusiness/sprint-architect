import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  TextInput,
  Platform,
  RefreshControl,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { T, cardShadow } from "@/constants/adminTheme";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { StatusPill, EmptyState, LoadingState, ErrorState } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { listClinics, ClinicListResponse } from "@/lib/api/adminClinics";

export default function ClinicsScreen() {
  const { user, logout } = useAuth();
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

  async function handleLogout() { await logout(); router.replace("/(auth)/login"); }

  if (isLoading) return (
    <View style={styles.root}>
      <AdminHeader title="Clinics" userEmail={user?.email} onLogout={handleLogout} right={<NewBtn />} />
      <LoadingState message="Loading clinics…" />
    </View>
  );
  if (isError) return (
    <View style={styles.root}>
      <AdminHeader title="Clinics" userEmail={user?.email} onLogout={handleLogout} right={<NewBtn />} />
      <ErrorState onRetry={refetch} />
    </View>
  );

  function NewBtn() {
    return (
      <Pressable testID="create-clinic-btn" style={styles.newBtn} onPress={() => router.push("/(admin)/clinics/create")}>
        <Ionicons name="add" size={16} color="#fff" />
        <Text style={styles.newBtnText}>New</Text>
      </Pressable>
    );
  }

  return (
    <View style={styles.root}>
      <AdminHeader title="Clinics" userEmail={user?.email} onLogout={handleLogout} right={<NewBtn />} />

      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={16} color={T.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search clinics…"
          placeholderTextColor={T.textMuted}
          value={search}
          onChangeText={handleSearchChange}
          returnKeyType="search"
        />
        {search.length > 0 && (
          <Pressable onPress={() => { setSearch(""); setDebouncedSearch(""); }} hitSlop={8}>
            <Ionicons name="close-circle" size={16} color={T.textMuted} />
          </Pressable>
        )}
      </View>

      {data && (
        <Text style={styles.countLabel}>{data.total} clinic{data.total !== 1 ? "s" : ""}</Text>
      )}

      <FlatList
        data={data?.rows ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.list, { paddingBottom: bottomPad + 100 }]}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={T.accent} />}
        scrollEnabled={!!(data?.rows?.length)}
        ListEmptyComponent={
          <EmptyState
            icon="business-outline"
            title="No clinics found"
            subtitle={debouncedSearch ? "Try a different search" : "Create your first clinic"}
          />
        }
        renderItem={({ item }) => (
          <Pressable
            style={({ pressed }) => [styles.card, cardShadow, { opacity: pressed ? 0.85 : 1 }]}
            onPress={() => router.push({ pathname: "/(admin)/clinics/[id]", params: { id: item.id } })}
          >
            <View style={styles.cardLeft}>
              <View style={styles.clinicIcon}>
                <Text style={styles.clinicIconText}>{item.name.slice(0, 1).toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={styles.clinicName} numberOfLines={1}>{item.name}</Text>
                <View style={styles.clinicMeta}>
                  {item.services && item.services.length > 0 && (
                    <Text style={styles.services} numberOfLines={1}>
                      {item.services.slice(0, 2).join(" · ")}
                      {item.services.length > 2 ? ` +${item.services.length - 2}` : ""}
                    </Text>
                  )}
                </View>
              </View>
            </View>
            <View style={styles.cardRight}>
              <StatusPill status={item.status} small />
              <Ionicons name="chevron-forward" size={14} color={T.textMuted} />
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  newBtn: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: T.primary, paddingHorizontal: 14, paddingVertical: 8, borderRadius: T.r8 },
  newBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: "#fff" },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: T.surface,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  searchInput: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 15, color: T.text },
  countLabel: { fontFamily: "Inter_400Regular", fontSize: 12, color: T.textMuted, paddingHorizontal: 16, paddingVertical: 8 },
  list: { paddingHorizontal: 16, paddingTop: 4, gap: 10 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: T.surface,
    borderRadius: T.r14,
    borderWidth: 1,
    borderColor: T.border,
    padding: 14,
    gap: 12,
  },
  cardLeft: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12 },
  cardRight: { flexDirection: "row", alignItems: "center", gap: 8, flexShrink: 0 },
  clinicIcon: { width: 40, height: 40, borderRadius: T.r10, backgroundColor: T.primary + "12", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  clinicIconText: { fontFamily: "Inter_700Bold", fontSize: 16, color: T.primary },
  clinicName: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: T.text },
  clinicMeta: { flexDirection: "row", alignItems: "center", gap: 6 },
  services: { fontFamily: "Inter_400Regular", fontSize: 12, color: T.textSec },
});
