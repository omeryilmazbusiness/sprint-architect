import { Platform } from "react-native";
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";

/**
 * On web, expo-font uses FontFaceObserver internally (ExpoFontLoader.web.js).
 * FontFaceObserver calls `.load(null, 6000)` which rejects after 6 seconds if the
 * browser font-loading API hasn't confirmed the font.  The rejection escapes
 * expo-font's own `.catch()` because Promise.all fires unhandledrejection on
 * individual promises before the outer chain can catch it.
 *
 * This guard is installed once at module load time (before any renders).
 * It suppresses those font-timeout rejections — the app is already resilient to
 * them via the fontError branch in _layout.tsx — and logs a DEV-only warning.
 *
 * Native: never runs (Platform.OS !== "web").
 */
function installWebFontRejectionGuard(): void {
  if (typeof window === "undefined") return;
  window.addEventListener("unhandledrejection", (event: PromiseRejectionEvent) => {
    const msg: string = event?.reason?.message ?? "";
    if (msg.includes("timeout exceeded") || msg.includes("ms timeout")) {
      event.preventDefault();
      if (__DEV__) {
        console.warn(
          "[FontLoader] Web font load timed out — using system font fallback." +
            " This is expected in slow/offline environments and does not affect the app."
        );
      }
    }
  });
}

// Install once at module-import time so it is in place before any useFonts call.
if (Platform.OS === "web") {
  installWebFontRejectionGuard();
}

/**
 * useAppFonts — safe, cross-platform font loading hook.
 *
 * NATIVE (iOS / Android):
 *   Delegates to useFonts(). Returns [loaded, error].
 *   App waits until fonts are ready or an error surfaces, then continues.
 *   fontError is handled gracefully in _layout.tsx.
 *
 * WEB:
 *   Starts font loading in the background (creates @font-face CSS + FontFaceObserver).
 *   Returns [true, null] immediately so the app never blocks on font readiness.
 *   Text renders instantly with the system font; Inter swaps in once the browser
 *   confirms loading.  Timeout rejections are silently suppressed by the guard above.
 *
 * Guarantees:
 *   - Always resolves to a usable state.
 *   - Never throws or causes an unhandled rejection.
 *   - Works offline, on slow networks, and in environments that block font assets.
 */
export function useAppFonts(): [boolean, Error | null] {
  const [loaded, error] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  if (Platform.OS === "web") {
    // Web: always signal "ready" immediately.
    // Font loading continues in the background; the rejection guard handles any
    // FontFaceObserver timeouts.  UI is never blocked.
    return [true, null];
  }

  return [loaded, error];
}
