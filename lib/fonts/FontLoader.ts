import { Platform } from "react-native";
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  useFonts,
} from "@expo-google-fonts/plus-jakarta-sans";

/**
 * useAppFonts — safe, cross-platform font loading hook.
 *
 * NATIVE (iOS / Android):
 *   Calls useFonts() with all Plus Jakarta Sans weights.
 *   App waits until fonts are ready or an error surfaces, then continues.
 *   fontError branch in _layout.tsx ensures the app always renders.
 *
 * WEB:
 *   Passes an empty font map so useFonts() resolves immediately without
 *   spawning FontFaceObserver internally.  FontFaceObserver calls
 *   `.load(null, 6000)` which throws an unhandled rejection in slow or
 *   sandboxed environments — this fix removes that code path entirely on web.
 *
 *   Web uses system fonts (typically -apple-system / Segoe UI / Roboto).
 *   This is acceptable: the app is mobile-first; web is a secondary surface.
 *
 * Guarantees:
 *   - Always resolves to a usable state.
 *   - Never throws or causes an unhandled rejection.
 *   - Works offline, on slow networks, and in constrained environments.
 *   - iOS and Android load Plus Jakarta Sans correctly and wait for readiness.
 */
export function useAppFonts(): [boolean, Error | null] {
  // Platform.OS is a compile-time constant per platform — passing different
  // values is not a conditional hook call and does not violate Rules of Hooks.
  const [loaded, error] = useFonts(
    Platform.OS === "web"
      ? {} // empty map → resolves immediately, no FontFaceObserver spawned
      : {
          PlusJakartaSans_400Regular,
          PlusJakartaSans_500Medium,
          PlusJakartaSans_600SemiBold,
          PlusJakartaSans_700Bold,
        },
  );

  // Web: signal "ready" immediately. Plus Jakarta Sans loaded on native only.
  if (Platform.OS === "web") return [true, null];

  return [loaded, error];
}
