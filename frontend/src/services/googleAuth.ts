import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { supabase } from "./supabase";

/**
 * "Continue with Google" for a parent or teacher: Supabase opens Google in the system browser, Google sends the
 * person back to the app, and the app trades the one-time code in the link for a session (PKCE; see supabase.ts).
 * Works in Expo Go and in a built app. Native Google sign-in (the ID-token way in Supabase's Expo guide) needs a
 * development build, so it is not used here.
 *
 * The redirect address must be in Supabase > Authentication > URL Configuration > Redirect URLs:
 *   marungko://**        (installed app, scheme from app.config.ts)
 *   exp://**             (Expo Go while testing; remove before the thesis build goes out)
 * See docs/GOOGLE-LOGIN.md.
 */

export type GoogleResult = { ok: true } | { ok: false; cancelled: boolean; message?: string };

function paramsOf(url: string): URLSearchParams {
  const queryStart = url.indexOf("?");
  const hashStart = url.indexOf("#");
  const query = queryStart >= 0 ? url.slice(queryStart + 1, hashStart > queryStart ? hashStart : undefined) : "";
  const hash = hashStart >= 0 ? url.slice(hashStart + 1) : "";
  return new URLSearchParams([query, hash].filter(Boolean).join("&"));
}

export async function signInWithGoogle(): Promise<GoogleResult> {
  const redirectTo = Linking.createURL("auth-callback");
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
      skipBrowserRedirect: true,
      // Always let the person choose the account, so a shared school device does not silently reuse one.
      queryParams: { prompt: "select_account" },
    },
  });
  if (error || !data.url) return { ok: false, cancelled: false, message: error?.message };

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== "success") return { ok: false, cancelled: true };

  const params = paramsOf(result.url);
  const failure = params.get("error_description") ?? params.get("error");
  if (failure) return { ok: false, cancelled: false, message: failure };

  const code = params.get("code");
  if (code) {
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    return exchangeError ? { ok: false, cancelled: false, message: exchangeError.message } : { ok: true };
  }
  // A project still on the implicit flow would return the tokens themselves; accept that too.
  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");
  if (accessToken && refreshToken) {
    const { error: sessionError } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
    return sessionError ? { ok: false, cancelled: false, message: sessionError.message } : { ok: true };
  }
  return { ok: false, cancelled: false, message: "No sign-in code came back." };
}
