import { Platform, Alert, Linking } from "react-native";
import * as FileSystemLegacy from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";

function safeFilename(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9_\-.]/g, "_").slice(0, 128) || "document.pdf";
}

export async function downloadPdfToCache(
  url: string,
  filenameHint?: string
): Promise<{ uri: string }> {
  const filename = safeFilename(filenameHint ?? url.split("/").pop() ?? "document.pdf");
  const localUri = `${FileSystemLegacy.cacheDirectory}${filename}`;

  const dl = await FileSystemLegacy.downloadAsync(url, localUri);
  if (dl.status !== 200) {
    throw new Error(`[FileService] Download failed with HTTP ${dl.status}`);
  }
  return { uri: dl.uri };
}

export async function openPdf(uriOrUrl: string, filenameHint?: string): Promise<void> {
  try {
    if (Platform.OS === "web") {
      await Linking.openURL(uriOrUrl);
      return;
    }

    const isRemote = uriOrUrl.startsWith("http://") || uriOrUrl.startsWith("https://");
    let fileUri = uriOrUrl;

    if (isRemote) {
      const { uri } = await downloadPdfToCache(uriOrUrl, filenameHint);
      fileUri = uri;
    }

    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(fileUri, {
        mimeType: "application/pdf",
        dialogTitle: "Open PDF",
        UTI: "com.adobe.pdf",
      });
    } else {
      await Linking.openURL(fileUri);
    }
  } catch (err: any) {
    console.error("[FileService] openPdf error:", err?.message ?? err);
    Alert.alert("Could not open PDF", "Please try again.");
  }
}
