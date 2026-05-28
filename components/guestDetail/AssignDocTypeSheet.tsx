import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { T } from "@/constants/adminTheme";
import { useT } from "@/hooks/useT";
import { CenteredAppModal } from "@/components/modals/CenteredAppModal";

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
  const tg = useT().guestDetail;
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

  const title =
    step === "pick"
      ? tg.selectDocTypeTitle
      : selectedType?.name ?? tg.instructionLabel;

  return (
    <CenteredAppModal
      visible={visible}
      onClose={handleClose}
      title={title}
      scroll={step === "instruct"}
      bodyMinHeight={step === "pick" ? 320 : 0}
      headerLeading={
        step === "instruct" ? (
          <Pressable onPress={handleBack} hitSlop={10} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={20} color={T.accent} />
          </Pressable>
        ) : undefined
      }
      testID="assign-doc-type-modal"
    >
      {step === "pick" ? (
        isLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={T.accent} />
          </View>
        ) : docTypes.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="document-outline" size={36} color={T.textMuted} />
            <Text style={styles.emptyText}>{tg.noDocTypesDefined}</Text>
            <Text style={styles.emptyHint}>{tg.noDocTypesHint}</Text>
          </View>
        ) : (
          <FlatList
            data={docTypes}
            keyExtractor={(d) => d.id}
            contentContainerStyle={styles.list}
            style={styles.flatList}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator
            renderItem={({ item }) => (
              <Pressable
                onPress={() => handlePickType(item)}
                style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}
              >
                <View style={styles.docIcon}>
                  <Ionicons name="document-text-outline" size={20} color={T.accent} />
                </View>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  {item.note ? (
                    <Text style={styles.itemNote} numberOfLines={2}>
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
        <>
          <View style={styles.selectedDocBadge}>
            <Ionicons name="document-text" size={18} color={T.accent} />
            <Text style={styles.selectedDocName}>{selectedType?.name}</Text>
          </View>

          {selectedType?.note ? (
            <Text style={styles.docTypeHint}>{selectedType.note}</Text>
          ) : null}

          <Text style={styles.label}>{tg.instructionLabel}</Text>
          <TextInput
            style={styles.input}
            value={instruction}
            onChangeText={setInstruction}
            placeholder={tg.instructionPlaceholder}
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
                <Text style={styles.assignBtnText}>{tg.assignDocumentBtn}</Text>
              </>
            )}
          </Pressable>
        </>
      )}
    </CenteredAppModal>
  );
}

const styles = StyleSheet.create({
  backBtn: { marginRight: 4 },
  loadingBox: { padding: 48, alignItems: "center" },
  emptyBox: { padding: 32, alignItems: "center", gap: 10 },
  emptyText: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 14,
    color: T.textMuted,
    textAlign: "center",
  },
  emptyHint: {
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 12,
    color: T.textMuted,
    textAlign: "center",
  },
  flatList: { flex: 1, width: "100%" },
  list: { paddingBottom: 8, gap: 0 },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: T.sp12,
    padding: T.sp12,
    borderRadius: T.r12,
    backgroundColor: T.surfaceSubtle,
  },
  itemPressed: { opacity: 0.7, backgroundColor: "#EFF6FF" },
  docIcon: {
    width: 40,
    height: 40,
    borderRadius: T.r10,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  itemInfo: { flex: 1, gap: 3 },
  itemName: { fontFamily: "PlusJakartaSans_600SemiBold", fontSize: 15, color: T.text },
  itemNote: { fontFamily: "PlusJakartaSans_400Regular", fontSize: 12, color: T.textMuted },
  sep: { height: 8 },
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
  },
  label: { fontFamily: "PlusJakartaSans_600SemiBold", fontSize: 14, color: T.text },
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
  assignBtnDisabled: { opacity: 0.6 },
  assignBtnText: { fontFamily: "PlusJakartaSans_700Bold", fontSize: 15, color: "#fff" },
});
