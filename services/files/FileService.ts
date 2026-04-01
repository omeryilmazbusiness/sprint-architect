import { Platform, Linking } from "react-native";
import * as FileSystemLegacy from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";

function safeFilename(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9_\-.]/g, "_").slice(0, 128) || "document.pdf";
}

export async function downloadPdfToCache(
  url: string,
  filenameHint?: string
): Promise<{ uri: string }> {
  const cacheDir = FileSystemLegacy.cacheDirectory;
  if (!cacheDir) {
    throw new Error("Device cache directory is unavailable");
  }

  const filename = safeFilename(filenameHint ?? "document.pdf");
  const localUri = `${cacheDir}${filename}`;

  const dl = await FileSystemLegacy.downloadAsync(url, localUri);
  if (dl.status !== 200) {
    throw new Error(`Download failed (HTTP ${dl.status})`);
  }
  return { uri: dl.uri };
}

/**
 * Opens a PDF from a remote URL or a local file URI.
 * On native: downloads to device cache (if remote) then opens via system share sheet.
 * On web: opens URL in a new browser tab.
 * Throws on failure — callers are responsible for showing error UI.
 */
export async function openPdf(uriOrUrl: string, filenameHint?: string): Promise<void> {
  if (Platform.OS === "web") {
    const opened = await Linking.openURL(uriOrUrl);
    if (!opened) {
      throw new Error("Browser could not open the document");
    }
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
}
