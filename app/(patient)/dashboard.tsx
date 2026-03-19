import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Pressable,
  useColorScheme,
  Platform,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "@/context/AuthContext";
import { getApiUrl } from "@/lib/query-client";
import Colors from "@/constants/colors";
import { StatusBadge } from "@/components/StatusBadge";
import { LoadingView } from "@/components/LoadingView";
import { ErrorView } from "@/components/ErrorView";
import { EmptyState } from "@/components/EmptyState";

interface PatientDashboardData {
  patient: {
    id: string;
    fullName: string;
    patientKey: string;
    status: string;
  };
  appointments: Array<{
    id: string;
    title: string;
    type: string;
    status: string;
    startAt: string;
  }>;
  documents: Array<{
    id: string;
    status: string;
    rejectionReason?: string;
    instructionText?: string | null;
    documentType: {
      name: string;
    };
  }>;
  doctors: Array<{
    id: string;
    name: string;
    specialty: string;
  }>;
  plan: {
    doctor?: {
      name: string;
      specialty: string;
    };
    hotel?: {
      name: string;
      address: string;
    };
  };
}

function DocumentCard({ doc, colors, accessToken, onUploadSuccess }: { 
  doc: PatientDashboardData["documents"][0]; 
  colors: any; 
  accessToken: string | null;
  onUploadSuccess: () => void;
}) {
  const [isUploading, setIsUploading] = useState(false);

  const handleUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/pdf",
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      setIsUploading(true);
      const file = result.assets[0];
      
      const formData = new FormData();
      // @ts-ignore - React Native FormData expects this structure for files
      formData.append("file", {
        uri: file.uri,
        name: file.name || "document.pdf",
        type: "application/pdf",
      });

      const uploadUrl = `${getApiUrl()}v1/patient/documents/${doc.id}/upload`;
      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          // Do not set Content-Type header when using FormData in RN
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Upload failed");
      }

      onUploadSuccess();
      Alert.alert("Success", "Document uploaded successfully");
    } catch (error: any) {
      console.error("[Upload Error]", error);
      Alert.alert("Upload Failed", error.message || "An unexpected error occurred");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, flexDirection: 'column', alignItems: 'stretch' }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={styles.cardMain}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>{doc.documentType.name}</Text>
          {doc.instructionText ? (
            <Text style={[styles.cardSub, { color: colors.textSecondary, marginTop: 2 }]} numberOfLines={2}>
              {doc.instructionText}
            </Text>
          ) : null}
        </View>
        <StatusBadge status={doc.status as any} small />
      </View>

      {doc.status === "REJECTED" && doc.rejectionReason && (
        <View style={styles.rejectionContainer}>
          <Text style={styles.rejectionLabel}>Reason for rejection:</Text>
          <Text style={styles.rejectionText}>{doc.rejectionReason}</Text>
        </View>
      )}

      {(doc.status === "ASSIGNED" || doc.status === "REJECTED") && (
        <Pressable 
          onPress={handleUpload} 
          disabled={isUploading}
          style={[styles.uploadBtn, { backgroundColor: colors.primary }]}
        >
          {isUploading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="cloud-upload-outline" size={18} color="#fff" />
              <Text style={styles.uploadBtnText}>Upload PDF</Text>
            </>
          )}
        </Pressable>
      )}

      {doc.status === "UPLOADED" && (
        <View style={styles.statusInfo}>
          <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
          <Text style={[styles.statusInfoText, { color: colors.textSecondary }]}>Waiting for review</Text>
        </View>
      )}

      {doc.status === "APPROVED" && (
        <View style={styles.statusInfo}>
          <Ionicons name="checkmark-circle-outline" size={16} color={Colors.light.success} />
          <Text style={[styles.statusInfoText, { color: Colors.light.success }]}>Document approved</Text>
        </View>
      )}
    </View>
  );
}

export default function PatientDashboard() {
  const { logout, user, accessToken } = useAuth();
  const isDark = useColorScheme() === "dark";
  const colors = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch, isRefetching } = useQuery<PatientDashboardData>({
    queryKey: ["/v1/patient/dashboard"],
  });

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  if (isLoading) return <LoadingView />;
  if (isError || !data) return <ErrorView onRetry={refetch} />;

  const { patient, appointments, documents, plan = {} } = data;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: bottomPad + 40 }}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.accent} />
        }
      >
        <LinearGradient
          colors={[colors.primary, isDark ? "#00B4D8" : "#1A5276"]}
          style={[styles.hero, { paddingTop: topPad + 20 }]}
        >
          <View style={styles.heroHeader}>
            <View>
              <Text style={styles.heroName}>{patient.fullName}</Text>
              <View style={styles.heroRow}>
                <StatusBadge status={patient.status as any} small />
                <Text style={styles.heroKey}>ID: {patient.patientKey}</Text>
              </View>
            </View>
            <Pressable onPress={logout} style={styles.logoutBtn}>
              <Ionicons name="log-out-outline" size={24} color="#fff" />
            </Pressable>
          </View>
        </LinearGradient>

        <View style={styles.content}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>My Appointments</Text>
          {appointments.length === 0 ? (
            <EmptyState title="No upcoming appointments" icon="calendar-outline" />
          ) : (
            appointments.map((apt) => (
              <View key={apt.id} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.cardMain}>
                  <Text style={[styles.cardTitle, { color: colors.text }]}>{apt.title}</Text>
                  <Text style={[styles.cardSub, { color: colors.textSecondary }]}>
                    {apt.type} · {new Date(apt.startAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
                  </Text>
                </View>
                <StatusBadge status={apt.status as any} small />
              </View>
            ))
          )}

          <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 24 }]}>My Documents</Text>
          {documents.length === 0 ? (
            <EmptyState title="No documents found" />
          ) : (
            documents.map((doc) => (
              <DocumentCard 
                key={doc.id} 
                doc={doc} 
                colors={colors} 
                accessToken={accessToken}
                onUploadSuccess={() => queryClient.invalidateQueries({ queryKey: ["/v1/patient/dashboard"] })}
              />
            ))
          )}

          {plan.doctor && (
            <>
              <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 24 }]}>My Care Team</Text>
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Ionicons name="person-circle-outline" size={40} color={colors.accent} />
                <View style={styles.cardMain}>
                  <Text style={[styles.cardTitle, { color: colors.text }]}>{plan.doctor.name}</Text>
                  <Text style={[styles.cardSub, { color: colors.textSecondary }]}>{plan.doctor.specialty}</Text>
                </View>
              </View>
            </>
          )}

          {plan.hotel && (
            <>
              <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 24 }]}>My Hotel</Text>
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Ionicons name="bed-outline" size={40} color={colors.accent} />
                <View style={styles.cardMain}>
                  <Text style={[styles.cardTitle, { color: colors.text }]}>{plan.hotel.name}</Text>
                  <Text style={[styles.cardSub, { color: colors.textSecondary }]}>{plan.hotel.address}</Text>
                </View>
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  hero: {
    paddingHorizontal: 20,
    paddingBottom: 30,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  heroHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  heroName: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  heroRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 8,
  },
  heroKey: {
    color: "rgba(255,255,255,0.8)",
    fontFamily: "Inter_500Medium",
    fontSize: 14,
  },
  logoutBtn: {
    padding: 8,
  },
  content: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 12,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
    gap: 12,
  },
  cardMain: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  cardSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 12,
  },
  uploadBtnText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
  statusInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
  },
  statusInfoText: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
  },
  rejectionContainer: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#FFEBEE',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#D32F2F',
  },
  rejectionLabel: {
    fontSize: 12,
    color: '#D32F2F',
    fontFamily: 'Inter_700Bold',
    marginBottom: 2,
  },
  rejectionText: {
    fontSize: 13,
    color: '#B71C1C',
    fontFamily: 'Inter_400Regular',
  },
});
