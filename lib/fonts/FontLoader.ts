import { Platform } from "react-native";
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";

/**
 * useAppFonts — safe, cross-platform font loading hook.
 *
 * NATIVE (iOS / Android):
 *   Calls useFonts() with all Inter weights.
 *   App waits until fonts are ready or an error surfaces, then continues.
 *   fontError branch in _layout.tsx ensures the app always renders.
 *
 * WEB:
 *   Passes an empty font map so useFonts() resolves immediately without
 *   spawning FontFaceObserver internally.  FontFaceObserver calls
 *   `.load(null, 6000)` which throws an unhandled rejection in slow or
 *   sandboxed environments (e.g. Replit dev preview) — this fix removes
 *   that code path entirely on web.
 *
 *   Web uses system fonts (typically -apple-system / Segoe UI / Roboto).
 *   This is acceptable: the app is mobile-first; web is a secondary surface.
 *
 * Guarantees:
 *   - Always resolves to a usable state.
 *   - Never throws or causes an unhandled rejection.
 *   - Works offline, on slow networks, and in constrained environments.
 *   - iOS and Android load Inter correctly and wait for readiness.
 */
export function useAppFonts(): [boolean, Error | null] {
  // Platform.OS is a compile-time constant per platform — passing different
  // values is not a conditional hook call and does not violate Rules of Hooks.
  const [loaded, error] = useFonts(
    Platform.OS === "web"
      ? {} // empty map → resolves immediately, no FontFaceObserver spawned
      : {
          Inter_400Regular,
          Inter_500Medium,
          Inter_600SemiBold,
          Inter_700Bold,
        },
  );

  // Web: signal "ready" immediately. Inter loaded on native only.
  if (Platform.OS === "web") return [true, null];

  return [loaded, error];
}
