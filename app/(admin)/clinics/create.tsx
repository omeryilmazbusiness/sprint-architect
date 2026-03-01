import React, { useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { T, cardShadow } from "@/constants/adminTheme";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { Card, SectionHeader, TextField, PrimaryButton } from "@/components/ui";
import { createClinic } from "@/lib/api/adminClinics";

const ALL_SERVICES = ["Rinoplasti", "Göz", "Diş"] as const;

export default function CreateClinicScreen() {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [nameError, setNameError] = useState("");

  const addressRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);

  const mutation = useMutation({
    mutationFn: createClinic,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/v1/admin/clinics"] });
      qc.invalidateQueries({ queryKey: ["/v1/admin/metrics"] });
      router.replace("/(admin)/clinics");
    },
    onError: (err: any) => Alert.alert("Error", err.message || "Failed to create clinic"),
  });

  function toggleService(svc: string) {
    setSelectedServices((prev) =>
      prev.includes(svc) ? prev.filter((s) => s !== svc) : [...prev, svc]
    );
  }

  function handleSubmit() {
    const trimName = name.trim();
    if (!trimName) { setNameError("Clinic name is required"); return; }
    setNameError("");
    mutation.mutate({
      name: trimName,
      address: address.trim() || undefined,
      contactPhone: contactPhone.trim() || undefined,
      contactEmail: contactEmail.trim() || undefined,
      services: selectedServices,
    });
  }

  const bottomPad = Platform.OS === "web" ? 34 : 0;

  return (
    <View style={styles.root}>
      <AdminHeader
        title="New Clinic"
        backButton
        onBack={() => router.back()}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 60 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <SectionHeader label="Basic Info" />
          <Card>
            <View style={styles.fieldGroup}>
              <TextField
                label="Clinic Name *"
                placeholder="e.g. Istanbul Medical Center"
                value={name}
                onChangeText={(v) => { setName(v); if (nameError) setNameError(""); }}
                error={nameError || undefined}
                returnKeyType="next"
                onSubmitEditing={() => addressRef.current?.focus()}
              />
              <TextField
                label="Address"
                placeholder="Street address, district, city"
                value={address}
                onChangeText={setAddress}
                ref={addressRef}
                returnKeyType="next"
                onSubmitEditing={() => phoneRef.current?.focus()}
                multiline
              />
              <TextField
                label="Phone"
                placeholder="+90 XXX XXX XXXX"
                value={contactPhone}
                onChangeText={setContactPhone}
                ref={phoneRef}
                keyboardType="phone-pad"
                returnKeyType="next"
                onSubmitEditing={() => emailRef.current?.focus()}
              />
              <TextField
                label="Email"
                placeholder="clinic@example.com"
                value={contactEmail}
                onChangeText={setContactEmail}
                ref={emailRef}
                keyboardType="email-address"
                autoCapitalize="none"
                returnKeyType="done"
              />
            </View>
          </Card>

          <SectionHeader label="Services Offered" style={styles.sectionGap} />
          <Card>
            <Text style={styles.servicesHint}>Select all services this clinic provides</Text>
            <View style={styles.chipsRow}>
              {ALL_SERVICES.map((svc) => {
                const active = selectedServices.includes(svc);
                return (
                  <Pressable
                    key={svc}
                    style={[styles.chip, active ? styles.chipActive : styles.chipInactive]}
                    onPress={() => toggleService(svc)}
                  >
                    {active && <Ionicons name="checkmark" size={13} color="#fff" />}
                    <Text style={[styles.chipText, active ? styles.chipTextActive : styles.chipTextInactive]}>
                      {svc}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Card>

          <View style={[styles.actions, { marginBottom: bottomPad }]}>
            <PrimaryButton
              label={mutation.isPending ? "" : "Create Clinic"}
              loading={mutation.isPending}
              onPress={handleSubmit}
              icon={mutation.isPending ? undefined : "business-outline"}
              style={styles.submitBtn}
            />
            <Pressable
              style={({ pressed }) => [styles.cancelBtn, { opacity: pressed ? 0.7 : 1 }]}
              onPress={() => router.back()}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  content: { paddingHorizontal: 16, paddingTop: 20, gap: 4 },
  sectionGap: { marginTop: 16 },
  fieldGroup: { gap: 16 },
  servicesHint: { fontFamily: "Inter_400Regular", fontSize: 13, color: T.textSec, marginBottom: 14 },
  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: T.r10,
    borderWidth: 1.5,
  },
  chipActive: { backgroundColor: T.primary, borderColor: T.primary },
  chipInactive: { backgroundColor: T.surface, borderColor: T.border },
  chipText: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  chipTextActive: { color: "#fff" },
  chipTextInactive: { color: T.textSec },
  actions: { marginTop: 24, gap: 12 },
  submitBtn: { width: "100%" },
  cancelBtn: { alignItems: "center", paddingVertical: 14 },
  cancelBtnText: { fontFamily: "Inter_500Medium", fontSize: 15, color: T.textSec },
});
