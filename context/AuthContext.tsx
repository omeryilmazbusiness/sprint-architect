import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import {
  apiHeaders,
  getApiUrl,
  setAuthTokens,
  setUnauthorizedHandler,
  queryClient,
} from "@/lib/query-client";

export type UserRole = "SUPER_ADMIN" | "ADMIN" | "MANAGER" | "PATIENT";

export interface AuthUser {
  id: string;
  email?: string;
  fullName?: string;
  role: UserRole;
  clinicId: string | null;
  lastLoginAt?: string | null;
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

interface ApiError extends Error {
  code?: string;
  status?: number;
}

interface AuthContextValue {
  user: AuthUser | null;
  accessToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<UserRole>;
  loginAsPatient: (patientKey: string, deviceId: string, platform?: string) => Promise<void>;
  logout: () => Promise<void>;
}

// Tokens are credentials — store in SecureStore (encrypted on-device).
// User metadata is non-sensitive — kept in AsyncStorage (larger payload support).
const SECURE_KEY_ACCESS  = "ht_access_token";
const SECURE_KEY_REFRESH = "ht_refresh_token";
const ASYNC_KEY_USER     = "ht_user";

// ─── SecureStore helpers with AsyncStorage migration ─────────────────────────
// On first launch after upgrade the token may still be in AsyncStorage.
// We transparently migrate it to SecureStore and delete the insecure copy.

async function secureGet(key: string): Promise<string | null> {
  try {
    const val = await SecureStore.getItemAsync(key);
    if (val !== null) return val;

    // Legacy migration: token was stored in AsyncStorage before SecureStore upgrade.
    const legacy = await AsyncStorage.getItem(key);
    if (legacy !== null) {
      await SecureStore.setItemAsync(key, legacy);
      await AsyncStorage.removeItem(key).catch(() => {});
      console.log(`[Auth] Migrated ${key} from AsyncStorage → SecureStore`);
    }
    return legacy;
  } catch {
    return null;
  }
}

async function secureSet(key: string, value: string): Promise<void> {
  await SecureStore.setItemAsync(key, value);
  // Clean up any legacy AsyncStorage copy silently.
  AsyncStorage.removeItem(key).catch(() => {});
}

async function secureDelete(key: string): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(key).catch(() => {}),
    AsyncStorage.removeItem(key).catch(() => {}),
  ]);
}

// ─── API helper ───────────────────────────────────────────────────────────────

async function apiPost<T>(path: string, body: unknown, accessToken?: string): Promise<T> {
  const base = getApiUrl();
  const url = new URL(path, base).toString();
  const headers = apiHeaders({ "Content-Type": "application/json" });
  if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;
  const res = await fetch(url, { method: "POST", headers, body: JSON.stringify(body) });
  const data = await res.json() as { message?: string; code?: string };
  if (!res.ok) {
    const err: ApiError = Object.assign(
      new Error(data.message ?? "Request failed"),
      { code: data.code, status: res.status },
    );
    throw err;
  }
  return data as T;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]               = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [isLoading, setIsLoading]     = useState(true);

  const clearSession = useCallback(async () => {
    await Promise.all([
      secureDelete(SECURE_KEY_ACCESS),
      secureDelete(SECURE_KEY_REFRESH),
      AsyncStorage.removeItem(ASYNC_KEY_USER),
    ]);
    setAccessToken(null);
    setRefreshToken(null);
    setUser(null);
    setAuthTokens(null, null);
    queryClient.clear();
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => { clearSession(); });
  }, [clearSession]);

  // Restore session on app start.
  useEffect(() => {
    (async () => {
      try {
        const [storedAccess, storedRefresh, storedUser] = await Promise.all([
          secureGet(SECURE_KEY_ACCESS),
          secureGet(SECURE_KEY_REFRESH),
          AsyncStorage.getItem(ASYNC_KEY_USER),
        ]);
        if (storedAccess && storedRefresh && storedUser) {
          setAccessToken(storedAccess);
          setRefreshToken(storedRefresh);
          setUser(JSON.parse(storedUser) as AuthUser);
          setAuthTokens(storedAccess, storedRefresh);
        }
      } catch (e) {
        console.error("[Auth] Failed to restore session:", e);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const persistSession = useCallback(async (tokens: AuthTokens, userData: AuthUser) => {
    await Promise.all([
      secureSet(SECURE_KEY_ACCESS, tokens.accessToken),
      secureSet(SECURE_KEY_REFRESH, tokens.refreshToken),
      AsyncStorage.setItem(ASYNC_KEY_USER, JSON.stringify(userData)),
    ]);
    setAccessToken(tokens.accessToken);
    setRefreshToken(tokens.refreshToken);
    setUser(userData);
    setAuthTokens(tokens.accessToken, tokens.refreshToken);
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<UserRole> => {
    const data = await apiPost<{
      accessToken: string;
      refreshToken: string;
      user: { id: string; email: string; role: UserRole; clinicId: string | null; lastLoginAt?: string | null };
    }>("/v1/auth/login", { email, password });

    await persistSession(
      { accessToken: data.accessToken, refreshToken: data.refreshToken },
      { id: data.user.id, email: data.user.email, role: data.user.role, clinicId: data.user.clinicId, lastLoginAt: data.user.lastLoginAt ?? null },
    );
    return data.user.role;
  }, [persistSession]);

  const loginAsPatient = useCallback(async (patientKey: string, deviceId: string, platform?: string) => {
    const data = await apiPost<{
      accessToken: string;
      refreshToken: string;
      patient: { id: string; fullName: string; clinicId: string; status: string };
    }>("/v1/patient/auth/login", { patientKey, deviceId, ...(platform ? { platform } : {}) });

    await persistSession(
      { accessToken: data.accessToken, refreshToken: data.refreshToken },
      { id: data.patient.id, fullName: data.patient.fullName, role: "PATIENT", clinicId: data.patient.clinicId },
    );
  }, [persistSession]);

  const logout = useCallback(async () => {
    try {
      if (accessToken && refreshToken) {
        await apiPost("/v1/auth/logout", { refreshToken }, accessToken);
      }
    } catch {
    } finally {
      await clearSession();
    }
  }, [accessToken, refreshToken, clearSession]);

  const value = useMemo(() => ({
    user,
    accessToken,
    isLoading,
    isAuthenticated: !!user && !!accessToken,
    login,
    loginAsPatient,
    logout,
  }), [user, accessToken, isLoading, login, loginAsPatient, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
