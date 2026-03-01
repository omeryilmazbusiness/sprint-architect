import React, { createContext, useContext } from "react";
import { T, AdminTheme } from "@/constants/adminTheme";

const AdminThemeContext = createContext<AdminTheme>(T);

export function AdminThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <AdminThemeContext.Provider value={T}>
      {children}
    </AdminThemeContext.Provider>
  );
}

export function useAdminTheme(): AdminTheme {
  return useContext(AdminThemeContext);
}
