import { z } from "zod";
import { env } from "../config/env.js";
import { HttpError } from "../lib/httpError.js";

const TEMP_KEY_URL = "https://api.soniox.com/v1/auth/temporary-api-key";

const TempKeyResponseSchema = z.object({
  api_key: z.string().min(1),
  expires_at: z.string(),
});

export interface SonioxTemporaryKey {
  apiKey: string;
  expiresAt: string;
}

/**
 * Mints a short-lived, single-use Soniox key for ONE real-time transcription
 * session. The long-lived SONIOX_API_KEY never leaves this server.
 */
export async function mintTemporaryKey(): Promise<SonioxTemporaryKey> {
  let response: Response;
  try {
    response = await fetch(TEMP_KEY_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.SONIOX_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        usage_type: "transcribe_websocket",
        expires_in_seconds: env.SONIOX_TEMP_KEY_TTL_SECONDS,
        single_use: true,
        max_session_duration_seconds: env.SONIOX_MAX_SESSION_SECONDS,
      }),
      signal: AbortSignal.timeout(5_000),
    });
  } catch (error) {
    console.error("[soniox] request failed:", error instanceof Error ? error.message : error);
    throw new HttpError(502, "stt_unavailable", "Speech service is unreachable.");
  }

  if (!response.ok) {
    // Log the status only; never log request headers or the key.
    console.error(`[soniox] temporary key request rejected with HTTP ${response.status}`);
    throw new HttpError(502, "stt_unavailable", "Speech service rejected the request.");
  }

  const parsed = TempKeyResponseSchema.safeParse(await response.json());
  if (!parsed.success) {
    console.error("[soniox] unexpected response shape from temporary-api-key endpoint");
    throw new HttpError(502, "stt_unavailable", "Speech service returned an unexpected response.");
  }

  return { apiKey: parsed.data.api_key, expiresAt: parsed.data.expires_at };
}
