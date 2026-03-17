import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Pressable,
  TextInput,
  ScrollView,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { T } from "@/constants/adminTheme";
import { VEHICLE_BRANDS, type VehicleBrandKey } from "@/constants/vehicleBrands";
import { BrandBadge } from "./BrandBadge";
import { PhonePickerInput, type PhonePickerValue } from "@/components/forms/PhonePickerInput";

const EMPTY_PHONE: PhonePickerValue = { raw: "", e164: null, countryCode: "TR" };
const SCREEN_H = Dimensions.get("window").height;

export interface TransportFormData {
  driverFullName: string;
  driverPhoneE164: string;
  vehicleBrand: VehicleBrandKey | "";
  vehicleModel: string;
  licensePlate: string;
}

export interface TransportFormItem {
  id: string;
  driverFullName: string;
  driverPhoneE164: string;
  vehicleBrand: string;
  vehicleModel: string;
  licensePlate: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: TransportFormData) => void;
  isLoading: boolean;
  editItem?: TransportFormItem | null;
}

export function TransportFormSheet({ visible, onClose, onSubmit, isLoading, editItem }: Props) {
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(SCREEN_H)).current;

  const [driverFullName, setDriverFullName] = useState("");
  const [phone, setPhone] = useState<PhonePickerValue>(EMPTY_PHONE);
  const [vehicleBrand, setVehicleBrand] = useState<VehicleBrandKey | "">("");
  const [vehicleModel, setVehicleModel] = useState("");
  const [licensePlate, setLicensePlate] = useState("");
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});

  useEffect(() => {
    if (visible) {
      if (editItem) {
        setDriverFullName(editItem.driverFullName ?? "");
        setPhone({ raw: editItem.driverPhoneE164 ?? "", e164: editItem.driverPhoneE164 ?? null, countryCode: "TR" });
        setVehicleBrand((editItem.vehicleBrand as VehicleBrandKey) ?? "");
        setVehicleModel(editItem.vehicleModel ?? "");
        setLicensePlate(editItem.licensePlate ?? "");
      } else {
        resetForm();
      }
      setErrors({});
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: SCREEN_H,
        duration: 220,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, editItem]);

  const resetForm = () => {
    setDriverFullName("");
    setPhone(EMPTY_PHONE);
    setVehicleBrand("");
    setVehicleModel("");
    setLicensePlate("");
  };

  const validate = () => {
    const e: Partial<Record<string, string>> = {};
    if (!driverFullName.trim()) e.driverFullName = "Driver name required";
    if (!phone.e164) e.phone = "Valid phone required";
    if (!vehicleBrand) e.vehicleBrand = "Select a brand";
    if (!vehicleModel.trim()) e.vehicleModel = "Model required";
    if (!licensePlate.trim() || licensePlate.trim().length < 3) e.licensePlate = "License plate required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (!validate() || isLoading) return;
    onSubmit({
      driverFullName: driverFullName.trim(),
      driverPhoneE164: phone.e164!,
      vehicleBrand: vehicleBrand as VehicleBrandKey,
      vehicleModel: vehicleModel.trim(),
      licensePlate: licensePlate.trim().toUpperCase(),
    });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <Animated.View
          style={[
            styles.sheet,
            { paddingBottom: insets.bottom + 16 },
            { transform: [{ translateY: slideAnim }] },
          ]}
        >
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
            <View style={styles.handle} />

            <View style={styles.header}>
              <Text style={styles.title}>{editItem ? "Edit Transport" : "Add Transport"}</Text>
              <Pressable onPress={onClose} hitSlop={10} style={styles.closeBtn}>
                <Ionicons name="close" size={22} color={T.text} />
              </Pressable>
            </View>

            <ScrollView
              contentContainerStyle={styles.body}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <SectionLabel>Driver</SectionLabel>

              <FieldWrapper label="Full Name" error={errors.driverFullName}>
                <TextInput
                  style={[styles.input, !!errors.driverFullName && styles.inputError]}
                  placeholder="John Doe"
                  placeholderTextColor={T.textMuted}
                  value={driverFullName}
                  onChangeText={setDriverFullName}
                  returnKeyType="next"
                  testID="input-driver-name"
                />
              </FieldWrapper>

              <FieldWrapper label="Phone" error={errors.phone}>
                <PhonePickerInput
                  value={phone}
                  onChange={setPhone}
                  hasError={!!errors.phone}
                  testID="input-driver-phone"
                />
              </FieldWrapper>

              <SectionLabel>Vehicle</SectionLabel>

              <View style={styles.fieldGroup}>
                <Text style={[styles.label, !!errors.vehicleBrand && { color: T.danger }]}>
                  Brand {errors.vehicleBrand ? `— ${errors.vehicleBrand}` : ""}
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.brandRow}>
                  {VEHICLE_BRANDS.map((b) => {
                    const selected = vehicleBrand === b.key;
                    return (
                      <Pressable
                        key={b.key}
                        onPress={() => setVehicleBrand(b.key)}
                        style={[styles.brandOption, selected && styles.brandOptionSelected]}
                        testID={`brand-${b.key}`}
                      >
                        <BrandBadge brand={b.key} size={38} />
                        <Text style={[styles.brandLabel, selected && styles.brandLabelSelected]}>
                          {b.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>

              <FieldWrapper label="Model" error={errors.vehicleModel}>
                <TextInput
                  style={[styles.input, !!errors.vehicleModel && styles.inputError]}
                  placeholder="Vito 2020"
                  placeholderTextColor={T.textMuted}
                  value={vehicleModel}
                  onChangeText={setVehicleModel}
                  returnKeyType="next"
                  testID="input-vehicle-model"
                />
              </FieldWrapper>

              <FieldWrapper label="License Plate" error={errors.licensePlate}>
                <TextInput
                  style={[styles.input, !!errors.licensePlate && styles.inputError]}
                  placeholder="34 ABC 123"
                  placeholderTextColor={T.textMuted}
                  value={licensePlate}
                  onChangeText={(v) => setLicensePlate(v.toUpperCase())}
                  autoCapitalize="characters"
                  returnKeyType="done"
                  onSubmitEditing={handleSubmit}
                  testID="input-license-plate"
                />
              </FieldWrapper>

              <Pressable
                style={({ pressed }) => [styles.submitBtn, { opacity: pressed || isLoading ? 0.75 : 1 }]}
                onPress={handleSubmit}
                disabled={isLoading}
                testID="btn-submit-transport"
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <Text style={styles.submitText}>{editItem ? "Save Changes" : "Add Transport"}</Text>
                )}
              </Pressable>
            </ScrollView>
          </KeyboardAvoidingView>
        </Animated.View>
      </View>
    </Modal>
  );
}

function SectionLabel({ children }: { children: string }) {
  return <Text style={styles.sectionLabel}>{children}</Text>;
}

function FieldWrapper({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={[styles.label, !!error && { color: T.danger }]}>
        {label}{error ? ` — ${error}` : ""}
      </Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.40)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: T.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "90%",
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#D1D5DB",
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 4,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F2F5",
  },
  title: {
    flex: 1,
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: T.text,
  },
  closeBtn: {
    padding: 4,
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    gap: 16,
  },
  sectionLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: T.textMuted,
    letterSpacing: 1.1,
    textTransform: "uppercase",
    marginTop: 4,
    marginBottom: -4,
  },
  fieldGroup: {
    gap: 8,
  },
  label: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: T.text,
  },
  input: {
    height: 46,
    backgroundColor: "#F7F9FC",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E8ECF0",
    paddingHorizontal: 14,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: T.text,
  },
  inputError: {
    borderColor: T.danger,
    backgroundColor: "#FFF5F5",
  },
  brandRow: {
    gap: 10,
    paddingVertical: 2,
  },
  brandOption: {
    alignItems: "center",
    gap: 6,
    padding: 10,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "transparent",
    backgroundColor: "#F7F9FC",
    minWidth: 72,
  },
  brandOptionSelected: {
    borderColor: T.accent,
    backgroundColor: "#EFF6FF",
  },
  brandLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: T.textMuted,
    textAlign: "center",
  },
  brandLabelSelected: {
    color: T.accent,
    fontFamily: "Inter_600SemiBold",
  },
  submitBtn: {
    backgroundColor: T.primary,
    borderRadius: 12,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  submitText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF",
  },
});
