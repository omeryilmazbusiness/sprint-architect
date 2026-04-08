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
  Dimensions,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { T } from "@/constants/adminTheme";

const SCREEN_HEIGHT = Dimensions.get("window").height;

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
      statusBarTranslucent
    >
      <View style={styles.root}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={handleClose} />
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.kavWrapper}
          keyboardVerticalOffset={0}
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
                {step === "pick"
                  ? "Select Document Type"
                  : selectedType?.name ?? "Add Note"}
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
                  style={styles.flatList}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
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
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.selectedDocBadge}>
                  <Ionicons name="document-text" size={18} color={T.accent} />
                  <Text style={styles.selectedDocName}>
                    {selectedType?.name}
                  </Text>
                </View>

                {selectedType?.note ? (
                  <Text style={styles.docTypeHint}>{selectedType.note}</Text>
                ) : null}

                <Text style={styles.label}>Instruction / Note for Guest</Text>
                <TextInput
                  style={styles.input}
                  value={instruction}
                  onChangeText={setInstruction}
                  placeholder="e.g. Please scan and upload your passport"
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
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  kavWrapper: {
    width: "100%",
  },
  sheet: {
    backgroundColor: T.surface,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    maxHeight: SCREEN_HEIGHT * 0.78,
    paddingBottom: Platform.OS === "ios" ? 34 : Platform.OS === "web" ? 34 : 16,
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
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 17,
    color: T.text,
    flex: 1,
  },
  loadingBox: {
    padding: 48,
    alignItems: "center",
  },
  emptyBox: {
    padding: 40,
    alignItems: "center",
    gap: 10,
  },
  emptyText: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 14,
    color: T.textMuted,
  },
  emptyHint: {
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 12,
    color: T.textMuted,
    textAlign: "center",
  },
  flatList: {
    flex: 1,
  },
  list: {
    padding: T.sp16,
    paddingBottom: T.sp24,
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
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 15,
    color: T.text,
  },
  itemNote: {
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 12,
    color: T.textMuted,
  },
  sep: {
    height: 8,
  },
  instructionContent: {
    padding: T.sp20,
    gap: T.sp12,
    paddingBottom: T.sp32,
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
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 15,
    color: T.accent,
    flex: 1,
  },
  docTypeHint: {
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 13,
    color: T.textSec,
    paddingLeft: 2,
  },
  label: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 14,
    color: T.text,
  },
  input: {
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: T.r12,
    padding: T.sp16,
    minHeight: 100,
    fontFamily: "PlusJakartaSans_400Regular",
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
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 15,
    color: "#fff",
  },
});
