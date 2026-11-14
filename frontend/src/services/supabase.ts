import "react-native-url-polyfill/auto";
import "./cryptoPolyfill";
import { createClient } from "@supabase/supabase-js";
import { AppState, Platform } from "react-native";
import { secureSessionStorage } from "./secureSessionStorage";

// Expo only inlines these when written exactly as process.env.EXPO_PUBLIC_*.
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  throw new Error(
    "Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY in frontend/.env",
  );
}

export const supabase = createClient(url, key, {
  auth: {
    ...(Platform.OS !== "web" ? { storage: secureSessionStorage } : {}),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    // PKCE: if a link-based email or a social sign-in is ever used, the page it opens carries a short-lived one-use
    // code, never the access token itself. (The sign-up and password-reset emails use a typed code: AuthFlow.tsx.)
    flowType: "pkce",
  },
});

// Refresh tokens only while the app is in the foreground. Register once.
if (Platform.OS !== "web") {
  AppState.addEventListener("change", (state) => {
    if (state === "active") {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}
