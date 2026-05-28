import { Platform, Share } from "react-native";
import { NativeModulesProxy } from "expo-modules-core";

interface ClipboardNative {
  setStringAsync?: (text: string) => Promise<boolean | void>;
}

/**
 * Resolve the native clipboard module without importing `expo-clipboard`.
 * Importing that package runs `requireNativeModule('ExpoClipboard')` at load time
 * and crashes when the dev client was not rebuilt after adding the dependency.
 */
function getClipboardNative(): ClipboardNative | null {
  if (Platform.OS === "web") return null;

  const proxy = NativeModulesProxy as Record<string, ClipboardNative | undefined>;
  const mod = proxy.ExpoClipboard ?? proxy.ClipboardModule;
  if (mod && typeof mod.setStringAsync === "function") {
    return mod;
  }
  return null;
}

/**
 * Copy text to the system clipboard (web, iOS, Android).
 * Falls back to Share sheet if the native clipboard module is unavailable
 * (rebuild required: `npx expo run:ios` or `npx expo run:android`).
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  const value = text?.trim();
  if (!value) return false;

  if (Platform.OS === "web") {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
        return true;
      }
    } catch {
      return false;
    }
    return false;
  }

  const clipboard = getClipboardNative();
  if (clipboard?.setStringAsync) {
    try {
      await clipboard.setStringAsync(value);
      return true;
    } catch {
      // fall through to Share
    }
  }

  try {
    await Share.share({ message: value });
    return true;
  } catch {
    return false;
  }
}
