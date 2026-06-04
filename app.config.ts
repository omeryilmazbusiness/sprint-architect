import type { ConfigContext, ExpoConfig } from "expo/config";
import appJson from "./app.json";

/** From `eas init` — @omeryilmazbusiness/healthtour */
const EAS_PROJECT_ID = "f9e13049-e0fb-4860-997c-87e5201e9f02";

const IS_PROD_BUILD =
  process.env.EAS_BUILD_PROFILE === "production" ||
  process.env.NODE_ENV === "production";

export default ({ config }: ConfigContext): ExpoConfig => {
  const base = (appJson.expo ?? {}) as ExpoConfig;
  const apiUrl =
    process.env.EXPO_PUBLIC_API_URL?.trim() || "http://127.0.0.1:5000";
  const reviewMode = process.env.EXPO_PUBLIC_REVIEW_MODE === "1";

  const iosInfoPlist: Record<string, unknown> = {
    ...(base.ios?.infoPlist as Record<string, unknown> | undefined),
    NSUserNotificationsUsageDescription: reviewMode
      ? "Healory sends updates about your community events and shared activity."
      : "Healory uses notifications to keep you updated on your account and activity.",
    NSCameraUsageDescription: reviewMode
      ? "Healory uses the camera so you can add photos to your community profile and uploads."
      : "Healory uses the camera to upload files and profile photos.",
    NSPhotoLibraryUsageDescription: reviewMode
      ? "Healory uses your photo library to share images with your community."
      : "Healory uses your photo library to upload files and images.",
    ITSAppUsesNonExemptEncryption: false,
  };

  if (!IS_PROD_BUILD) {
    iosInfoPlist.NSAppTransportSecurity = {
      NSAllowsLocalNetworking: true,
      NSExceptionDomains: {
        localhost: { NSExceptionAllowsInsecureHTTPLoads: true },
        "127.0.0.1": { NSExceptionAllowsInsecureHTTPLoads: true },
      },
    };
  }

  return {
    ...config,
    ...base,
    name: base.name ?? config.name,
    slug: base.slug ?? config.slug,
    ios: {
      ...base.ios,
      buildNumber: process.env.IOS_BUILD_NUMBER ?? "1",
      infoPlist: iosInfoPlist,
    },
    android: {
      ...base.android,
      versionCode: Number(process.env.ANDROID_VERSION_CODE ?? "1"),
    },
    extra: {
      ...((base.extra as Record<string, unknown>) ?? {}),
      apiUrl,
      reviewMode,
      eas: {
        projectId: process.env.EAS_PROJECT_ID ?? EAS_PROJECT_ID,
      },
    },
  };
};
