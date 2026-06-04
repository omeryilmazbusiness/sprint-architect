import Constants from "expo-constants";

/** True on App Store review builds (EAS profile `review`). */
export function isReviewMode(): boolean {
  return Constants.expoConfig?.extra?.reviewMode === true;
}
