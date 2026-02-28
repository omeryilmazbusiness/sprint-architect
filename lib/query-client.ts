import { fetch } from "expo/fetch";
import { QueryClient, QueryFunction } from "@tanstack/react-query";

/**
 * Gets the base URL for the Express API server (e.g., "https://hostname.replit.dev")
 */
export function getApiUrl(): string {
  let host = process.env.EXPO_PUBLIC_DOMAIN;
  if (!host) throw new Error("EXPO_PUBLIC_DOMAIN is not set");
  return new URL(`https://${host}`).href;
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

let _accessToken: string | null = null;
let _refreshToken: string | null = null;
let _onUnauthorized: (() => void) | null = null;

export function setAuthTokens(access: string | null, refresh: string | null) {
  _accessToken = access;
  _refreshToken = refresh;
}

export function setUnauthorizedHandler(fn: () => void) {
  _onUnauthorized = fn;
}

async function tryRefreshToken(): Promise<string | null> {
  if (!_refreshToken) return null;
  try {
    const baseUrl = getApiUrl();
    const url = new URL("/v1/auth/refresh", baseUrl);
    const res = await fetch(url.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: _refreshToken }),
    });
    if (!res.ok) return null;
    const data = await res.json() as { accessToken: string; refreshToken: string };
    _accessToken = data.accessToken;
    _refreshToken = data.refreshToken;
    return data.accessToken;
  } catch {
    return null;
  }
}

export async function apiRequest(
  method: string,
  route: string,
  data?: unknown,
): Promise<Response> {
  const baseUrl = getApiUrl();
  const url = new URL(route, baseUrl);
  const headers: Record<string, string> = {};
  if (data) headers["Content-Type"] = "application/json";
  if (_accessToken) headers["Authorization"] = `Bearer ${_accessToken}`;

  let res = await fetch(url.toString(), {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  if (res.status === 401 && _refreshToken) {
    const newToken = await tryRefreshToken();
    if (newToken) {
      headers["Authorization"] = `Bearer ${newToken}`;
      res = await fetch(url.toString(), {
        method,
        headers,
        body: data ? JSON.stringify(data) : undefined,
        credentials: "include",
      });
    } else {
      _onUnauthorized?.();
    }
  }

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const baseUrl = getApiUrl();
    const route = queryKey.join("/") as string;
    const url = new URL(route.startsWith("/") ? route : `/${route}`, baseUrl);

    const headers: Record<string, string> = {};
    if (_accessToken) headers["Authorization"] = `Bearer ${_accessToken}`;

    let res = await fetch(url.toString(), { credentials: "include", headers });

    if (res.status === 401 && _refreshToken) {
      const newToken = await tryRefreshToken();
      if (newToken) {
        headers["Authorization"] = `Bearer ${newToken}`;
        res = await fetch(url.toString(), { credentials: "include", headers });
      } else {
        _onUnauthorized?.();
        if (unauthorizedBehavior === "returnNull") return null;
        throw new Error("401: Unauthorized");
      }
    }

    if (unauthorizedBehavior === "returnNull" && res.status === 401) return null;
    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
