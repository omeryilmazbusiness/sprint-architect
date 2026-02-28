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
  useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Colors from "@/constants/colors";
import { createClinic } from "@/lib/api/adminClinics";

const ALL_SERVICES = ["Rinoplasti", "Göz", "Diş"] as const;

export default function CreateClinicScreen() {
  const isDark = useColorScheme() === "dark";
  const colors = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [selectedServices, setSelectedServices] = useState<string[]>([]);

  const addressRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);

  const mutation = useMutation({
    mutationFn: createClinic,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/v1/admin/clinics"] });
      qc.invalidateQueries({ queryKey: ["/v1/admin/metrics"] });
      Alert.alert("Clinic Created", `"${name}" was added successfully.`, [
        { text: "OK", onPress: () => router.back() },
      ]);
    },
    onError: (err: any) =>
      Alert.alert("Error", err.message || "Failed to create clinic"),
  });

  function toggleService(svc: string) {
    setSelectedServices((prev) =>
      prev.includes(svc) ? prev.filter((s) => s !== svc) : [...prev, svc]
    );
  }

  function handleSubmit() {
    const trimName = name.trim();
    const trimAddress = address.trim();
    const trimPhone = contactPhone.trim();
    const trimEmail = contactEmail.trim().toLowerCase();

    if (!trimName) return Alert.alert("Required", "Clinic name is required.");
    if (!trimAddress) return Alert.alert("Required", "Address is required.");
    if (!trimPhone || trimPhone.length < 7)
      return Alert.alert("Required", "Enter a valid phone number.");
    if (!trimEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimEmail))
      return Alert.alert("Required", "Enter a valid email address.");

    mutation.mutate({
      name: trimName,
      address: trimAddress,
      contactPhone: trimPhone,
      contactEmail: trimEmail,
      services: selectedServices,
    });
  }

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={0}
    >
      <View style={[styles.header, { paddingTop: topPad + 12, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.6 : 1 }]}
          hitSlop={10}
        >
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text, fontFamily: "Inter_700Bold" }]}>
          Create Clinic
        </Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 32 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <FieldLabel colors={colors} label="Clinic Name" required />
        <TextInput
          style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.card, fontFamily: "Inter_400Regular" }]}
          placeholder="e.g. Istanbul Health Clinic"
          placeholderTextColor={colors.textMuted}
          value={name}
          onChangeText={setName}
          returnKeyType="next"
          onSubmitEditing={() => addressRef.current?.focus()}
          autoCapitalize="words"
          testID="clinicName"
        />

        <FieldLabel colors={colors} label="Address" required />
        <TextInput
          ref={addressRef}
          style={[styles.input, styles.multilineInput, { borderColor: colors.border, color: colors.text, backgroundColor: colors.card, fontFamily: "Inter_400Regular" }]}
          placeholder="Full clinic address"
          placeholderTextColor={colors.textMuted}
          value={address}
          onChangeText={setAddress}
          multiline
          numberOfLines={3}
          returnKeyType="next"
          onSubmitEditing={() => phoneRef.current?.focus()}
          blurOnSubmit={false}
          testID="clinicAddress"
        />

        <FieldLabel colors={colors} label="Contact Phone" required />
        <TextInput
          ref={phoneRef}
          style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.card, fontFamily: "Inter_400Regular" }]}
          placeholder="+90 212 000 0000"
          placeholderTextColor={colors.textMuted}
          value={contactPhone}
          onChangeText={setContactPhone}
          keyboardType="phone-pad"
          returnKeyType="next"
          onSubmitEditing={() => emailRef.current?.focus()}
          testID="clinicPhone"
        />

        <FieldLabel colors={colors} label="Contact Email" required />
        <TextInput
          ref={emailRef}
          style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.card, fontFamily: "Inter_400Regular" }]}
          placeholder="clinic@example.com"
          placeholderTextColor={colors.textMuted}
          value={contactEmail}
          onChangeText={setContactEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="done"
          testID="clinicEmail"
        />

        <FieldLabel colors={colors} label="Services Offered" />
        <View style={styles.chipsRow}>
          {ALL_SERVICES.map((svc) => {
            const active = selectedServices.includes(svc);
            return (
              <Pressable
                key={svc}
                onPress={() => toggleService(svc)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: active ? colors.accent : colors.card,
                    borderColor: active ? colors.accent : colors.border,
                  },
                ]}
              >
                {active && (
                  <Ionicons name="checkmark" size={13} color="#fff" style={{ marginRight: 4 }} />
                )}
                <Text
                  style={[
                    styles.chipText,
                    {
                      color: active ? "#fff" : colors.textSecondary,
                      fontFamily: active ? "Inter_600SemiBold" : "Inter_400Regular",
                    },
                  ]}
                >
                  {svc}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.submitBtn,
            { backgroundColor: colors.accent, opacity: pressed || mutation.isPending ? 0.8 : 1 },
          ]}
          onPress={handleSubmit}
          disabled={mutation.isPending}
          testID="createClinicSubmit"
        >
          {mutation.isPending ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={[styles.submitText, { fontFamily: "Inter_700Bold" }]}>Create Clinic</Text>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function FieldLabel({
  label,
  required,
  colors,
}: {
  label: string;
  required?: boolean;
  colors: typeof Colors.light;
}) {
  return (
    <Text style={[styles.fieldLabel, { color: colors.textSecondary, fontFamily: "Inter_600SemiBold" }]}>
      {label}
      {required ? <Text style={{ color: colors.error }}> *</Text> : null}
    </Text>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, textAlign: "center", fontSize: 18 },
  content: { padding: 20, gap: 0 },
  fieldLabel: {
    fontSize: 12,
    letterSpacing: 0.4,
    marginBottom: 7,
    marginTop: 20,
    textTransform: "uppercase",
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
  },
  multilineInput: {
    minHeight: 80,
    textAlignVertical: "top",
    paddingTop: 13,
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  chipText: { fontSize: 14 },
  submitBtn: {
    marginTop: 32,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  submitText: { fontSize: 16, color: "#fff" },
});
