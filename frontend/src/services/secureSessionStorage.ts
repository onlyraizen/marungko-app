import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";

/**
 * Where Supabase keeps the signed-in session (access token + refresh token).
 *
 * The session is stored in the phone's secure store (iOS Keychain / Android Keystore) instead of plain AsyncStorage.
 * SecureStore warns about values over about 2 KB and a session is larger, so the text is cut into 1800-character
 * pieces. A session saved by an earlier version in AsyncStorage is moved over the first time it is read, so nobody
 * is signed out by the update. If the secure store cannot be used (some emulators), it falls back to AsyncStorage
 * rather than failing to sign in.
 */

const CHUNK = 1800;
// SecureStore keys may only contain letters, digits, ".", "-" and "_".
const safe = (key: string) => key.replace(/[^\w.-]/g, "_");
const countKey = (key: string) => `${safe(key)}.n`;
const partKey = (key: string, index: number) => `${safe(key)}.${index}`;

async function removeParts(key: string): Promise<void> {
  const count = Number(await SecureStore.getItemAsync(countKey(key)));
  if (Number.isFinite(count)) {
    for (let index = 0; index < count; index += 1) await SecureStore.deleteItemAsync(partKey(key, index));
  }
  await SecureStore.deleteItemAsync(countKey(key));
}

async function secureSet(key: string, value: string): Promise<void> {
  await removeParts(key);
  const parts = value.match(new RegExp(`[\\s\\S]{1,${CHUNK}}`, "g")) ?? [""];
  for (let index = 0; index < parts.length; index += 1) await SecureStore.setItemAsync(partKey(key, index), parts[index] ?? "");
  await SecureStore.setItemAsync(countKey(key), String(parts.length));
}

async function secureGet(key: string): Promise<string | null> {
  const countText = await SecureStore.getItemAsync(countKey(key));
  if (countText === null) return null;
  let value = "";
  for (let index = 0; index < Number(countText); index += 1) {
    const part = await SecureStore.getItemAsync(partKey(key, index));
    if (part === null) return null; // a piece is missing: treat as signed out rather than hand over half a token
    value += part;
  }
  return value;
}

export const secureSessionStorage = {
  async getItem(key: string): Promise<string | null> {
    try {
      const secure = await secureGet(key);
      if (secure !== null) return secure;
      const old = await AsyncStorage.getItem(key);
      if (old !== null) {
        await secureSet(key, old);
        await AsyncStorage.removeItem(key);
      }
      return old;
    } catch {
      return AsyncStorage.getItem(key);
    }
  },
  async setItem(key: string, value: string): Promise<void> {
    try {
      await secureSet(key, value);
      await AsyncStorage.removeItem(key);
    } catch {
      await AsyncStorage.setItem(key, value);
    }
  },
  async removeItem(key: string): Promise<void> {
    try {
      await removeParts(key);
    } catch {
      // fall through: still clear the fallback copy below
    }
    await AsyncStorage.removeItem(key);
  },
};
