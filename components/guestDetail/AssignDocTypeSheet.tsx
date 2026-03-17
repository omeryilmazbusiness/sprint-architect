import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  FlatList,
  ActivityIndicator,
  TextInput,
  Platform,
  ScrollView,
  KeyboardAvoidingView,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { T } from "@/constants/adminTheme";

interface DocType {
  id: string;
  name: string;
  note: string | null;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onAssign: (typeId: string, instructionText: string) => void;
  assigning?: boolean;
}

export function AssignDocTypeSheet({
  visible,
  onClose,
  onAssign,
  assigning,
}: Props) {
  const [selectedType, setSelectedType] = useState<DocType | null>(null);
  const [instruction, setInstruction] = useState("");
  const [step, setStep] = useState<"pick" | "instruct">("pick");

  const { data, isLoading } = useQuery<{ items: DocType[] }>({
    queryKey: ["/v1/manager/document-types"],
    enabled: visible,
  });
  const docTypes = data?.items ?? [];

  function handleClose() {
    setSelectedType(null);
    setInstruction("");
    setStep("pick");
    onClose();
  }

  function handlePickType(dt: DocType) {
    setSelectedType(dt);
    setStep("instruct");
  }

  function handleBack() {
    setSelectedType(null);
    setStep("pick");
  }

  function handleAssign() {
    if (!selectedType || assigning) return;
    onAssign(selectedType.id, instruction.trim());
    setSelectedType(null);
    setInstruction("");
    setStep("pick");
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <Pressable style={styles.overlay} onPress={handleClose} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.kavWrapper}
      >
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.sheetHeader}>
            {step === "instruct" && (
              <Pressable onPress={handleBack} hitSlop={10} style={styles.backBtn}>
                <Ionicons name="arrow-back" size={20} color={T.accent} />
              </Pressable>
            )}
            <Text style={styles.sheetTitle}>
              {step === "pick" ? "Select Document Type" : selectedType?.name ?? "Add Note"}
            </Text>
            <Pressable onPress={handleClose} hitSlop={10}>
              <Ionicons name="close" size={22} color={T.textMuted} />
            </Pressable>
          </View>

          {step === "pick" ? (
            isLoading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator color={T.accent} />
              </View>
            ) : docTypes.length === 0 ? (
              <View style={styles.emptyBox}>
                <Ionicons name="document-outline" size={36} color={T.textMuted} />
                <Text style={styles.emptyText}>No document types defined</Text>
                <Text style={styles.emptyHint}>
                  Add document types in Document Types settings first
                </Text>
              </View>
            ) : (
              <FlatList
                data={docTypes}
                keyExtractor={(d) => d.id}
                contentContainerStyle={styles.list}
                renderItem={({ item }) => (
                  <Pressable
                    onPress={() => handlePickType(item)}
                    style={({ pressed }) => [
                      styles.item,
                      pressed && styles.itemPressed,
                    ]}
                  >
                    <View style={styles.docIcon}>
                      <Ionicons
                        name="document-text-outline"
                        size={20}
                        color={T.accent}
                      />
                    </View>
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemName}>{item.name}</Text>
                      {item.note ? (
                        <Text style={styles.itemNote} numberOfLines={1}>
                          {item.note}
                        </Text>
                      ) : null}
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={T.textMuted} />
                  </Pressable>
                )}
                ItemSeparatorComponent={() => <View style={styles.sep} />}
              />
            )
          ) : (
            <ScrollView
              contentContainerStyle={styles.instructionContent}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.selectedDocBadge}>
                <Ionicons name="document-text" size={18} color={T.accent} />
                <Text style={styles.selectedDocName}>
                  {selectedType?.name}
                </Text>
              </View>

              <Text style={styles.label}>
                Instruction / Note
              </Text>
              <TextInput
                style={styles.input}
                value={instruction}
                onChangeText={setInstruction}
                placeholder="Enter instructions for the guest (optional)"
                placeholderTextColor={T.textMuted}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                autoFocus
              />

              <Pressable
                onPress={handleAssign}
                disabled={assigning}
                style={[styles.assignBtn, assigning && styles.assignBtnDisabled]}
              >
                {assigning ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons name="add-circle-outline" size={18} color="#fff" />
                    <Text style={styles.assignBtnText}>Assign Document</Text>
                  </>
                )}
              </Pressable>
            </ScrollView>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  kavWrapper: {
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: T.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "78%",
    paddingBottom: Platform.OS === "web" ? 34 : 48,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: T.border,
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 4,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: T.sp20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
    gap: 8,
  },
  backBtn: {
    marginRight: 4,
  },
  sheetTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 17,
    color: T.text,
    flex: 1,
  },
  loadingBox: {
    padding: 48,
    alignItems: "center",
  },
  emptyBox: {
    padding: 48,
    alignItems: "center",
    gap: 10,
  },
  emptyText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: T.textMuted,
  },
  emptyHint: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: T.textMuted,
    textAlign: "center",
  },
  list: {
    padding: T.sp16,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: T.sp12,
    padding: T.sp12,
    borderRadius: T.r12,
    backgroundColor: T.surfaceSubtle,
  },
  itemPressed: {
    opacity: 0.7,
    backgroundColor: "#EFF6FF",
  },
  docIcon: {
    width: 40,
    height: 40,
    borderRadius: T.r10,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  itemInfo: {
    flex: 1,
    gap: 3,
  },
  itemName: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: T.text,
  },
  itemNote: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: T.textMuted,
  },
  sep: {
    height: 8,
  },
  instructionContent: {
    padding: T.sp20,
    gap: T.sp16,
  },
  selectedDocBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#EFF6FF",
    paddingHorizontal: T.sp16,
    paddingVertical: 10,
    borderRadius: T.r10,
  },
  selectedDocName: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: T.accent,
  },
  label: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: T.text,
  },
  input: {
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: T.r12,
    padding: T.sp16,
    minHeight: 100,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: T.text,
    backgroundColor: T.surface,
  },
  assignBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: T.accent,
    paddingVertical: 14,
    borderRadius: T.r12,
  },
  assignBtnDisabled: {
    opacity: 0.6,
  },
  assignBtnText: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
    color: "#fff",
  },
});
