/**
 * Healory — Persistent Device Identity
 *
 * Provides a stable, installation-scoped device identifier that:
 *   - Persists across app restarts and updates
 *   - Survives process kills and background terminations
 *   - Is cleared on full app reinstall (correct security behavior)
 *   - Works on iOS, Android, and web (via SecureStore polyfill)
 *   - Never blocks the UI thread (async-first, cached after first read)
 *
 * Security model:
 *   - The ID is a randomly generated UUID stored in SecureStore
 *   - On iOS/Android, SecureStore is hardware-backed when the device
 *     supports it and is NOT accessible to other apps
 *   - On reinstall the ID changes — the user must ask their manager
 *     to reset their device binding (intentional security enforcement)
 *   - The backend is the authority: it validates and enforces binding
 *     — this module only ensures the client sends a *stable* ID
 *
 * Usage:
 *   const id = await getOrCreateDeviceId();
 */

import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const STORE_KEY = "@healory:deviceId:v1";

/** Simple collision-resistant ID generator (no external deps). */
function generateId(): string {
  const t = Date.now().toString(36);
  const r1 = Math.random().toString(36).slice(2, 9);
  const r2 = Math.random().toString(36).slice(2, 9);
  const r3 = Math.random().toString(36).slice(2, 9);
  return `${t}-${r1}-${r2}-${r3}`;
}

// In-memory cache: once resolved, all subsequent calls are synchronous.
let _cached: string | null = null;
// Singleton promise: concurrent first-calls all await the same read.
let _loading: Promise<string> | null = null;

async function readFromStore(): Promise<string | null> {
  try {
    if (Platform.OS === "web") {
      return localStorage.getItem(STORE_KEY);
    }
    return await SecureStore.getItemAsync(STORE_KEY);
  } catch {
    return null;
  }
}

async function writeToStore(id: string): Promise<void> {
  try {
    if (Platform.OS === "web") {
      localStorage.setItem(STORE_KEY, id);
    } else {
      await SecureStore.setItemAsync(STORE_KEY, id);
    }
  } catch {
    // Non-fatal: device ID still works in memory for this session.
  }
}

/**
 * Returns the stable device ID for this installation.
 *
 * - First call: reads from SecureStore, or generates and persists a new ID
 * - Subsequent calls: returns cached value instantly (no I/O)
 * - Concurrent first calls: coalesce onto a single I/O operation
 */
export async function getOrCreateDeviceId(): Promise<string> {
  if (_cached) return _cached;
  if (_loading) return _loading;

  _loading = (async (): Promise<string> => {
    const stored = await readFromStore();
    if (stored && stored.length > 0) {
      _cached = stored;
      return stored;
    }
    const id = generateId();
    await writeToStore(id);
    _cached = id;
    return id;
  })();

  return _loading;
}

/**
 * Synchronous read of the cached device ID.
 * Returns null until `getOrCreateDeviceId()` has resolved at least once.
 * Use only where async is not possible.
 */
export function getCachedDeviceId(): string | null {
  return _cached;
}
