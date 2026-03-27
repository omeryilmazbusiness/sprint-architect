import React, { createContext, useContext } from "react";

export type TabBarMetrics = {
  /** "native" = NativeTabs (OS manages layout — no extra padding needed).
   *  "classic" = Classic Tabs with BlurView (floating/absolute — we add padding). */
  mode: "native" | "classic";
  /** Total pixels of paddingBottom screens must add to clear the tab bar.
   *  Includes insets.bottom + bar offset + bar height.
   *  0 for NativeTabs — the OS already reserves the space. */
  bottomPadding: number;
};

const DEFAULT_METRICS: TabBarMetrics = {
  mode: "classic",
  bottomPadding: 0,
};

const TabBarMetricsContext = createContext<TabBarMetrics>(DEFAULT_METRICS);

interface TabBarMetricsProviderProps extends TabBarMetrics {
  children: React.ReactNode;
}

export function TabBarMetricsProvider({
  mode,
  bottomPadding,
  children,
}: TabBarMetricsProviderProps) {
  return (
    <TabBarMetricsContext.Provider value={{ mode, bottomPadding }}>
      {children}
    </TabBarMetricsContext.Provider>
  );
}

/**
 * Returns the tab bar metrics for the current layout context.
 * Safe to call inside both NativeTabs and Classic Tabs screens — never throws.
 */
export function useTabBarMetrics(): TabBarMetrics {
  return useContext(TabBarMetricsContext);
}
