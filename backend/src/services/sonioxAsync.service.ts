import { z } from "zod";
import { env } from "../config/env.js";
import { HttpError } from "../lib/httpError.js";

const API = "https://api.soniox.com/v1";
const POLL_INTERVAL_MS = 600;
const MAX_WAIT_MS = 20_000;

const FileSchema = z.object({ id: z.string().min(1) });
const TranscriptionSchema = z.object({
  id: z.string().min(1),
  status: z.string(),
  error_message: z.string().nullish(),
});
const TranscriptSchema = z.object({
  text: z.string(),
  tokens: z
    .array(z.object({ text: z.string(), confidence: z.number().nullish() }))
    .default([]),
});

export interface ClipTranscript {
  text: string;
  /** Mean token confidence, 0 to 1, or null if Soniox returned no tokens. */
  confidence: number | null;
}

const authHeader = { Authorization: `Bearer ${env.SONIOX_API_KEY}` };

async function call(path: string, init: RequestInit): Promise<Response> {
  let response: Response;
  try {
    response = await fetch(`${API}${path}`, {
      ...init,
      headers: { ...authHeader, ...(init.headers ?? {}) },
      signal: AbortSignal.timeout(8_000),
    });
  } catch (error) {
    console.error("[soniox] request failed:", error instanceof Error ? error.message : error);
    throw new HttpError(502, "stt_unavailable", "Speech service is unreachable.");
  }
  if (!response.ok) {
    // Status only: never log headers, bodies or keys.
    console.error(`[soniox] ${init.method ?? "GET"} ${path.split("/").slice(0, 3).join("/")} -> HTTP ${response.status}`);
    throw new HttpError(502, "stt_unavailable", "Speech service rejected the request.");
  }
  return response;
}

async function bestEffortDelete(path: string): Promise<void> {
  try {
    await fetch(`${API}${path}`, {
      method: "DELETE",
      headers: authHeader,
      signal: AbortSignal.timeout(5_000),
    });
  } catch {
    // Cleanup must never fail the request.
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Transcribes one short recorded clip through Soniox's async file API.
 * Used on devices that cannot stream live audio (Expo Go on iPhone).
 */
export async function transcribeClip(
  audio: Buffer,
  filename: string,
  terms: string[],
): Promise<ClipTranscript> {
  // 1. Upload
  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(audio)]), filename);
  const uploaded = FileSchema.safeParse(await (await call("/files", { method: "POST", body: form })).json());
  if (!uploaded.success) {
    throw new HttpError(502, "stt_unavailable", "Speech service returned an unexpected response.");
  }
  const fileId = uploaded.data.id;
  let transcriptionId: string | null = null;
  let finished = false;

  try {
    // 2. Create the job
    const context =
      terms.length > 0
        ? `Children reading Tagalog syllables and words aloud. Expected: ${terms.join(", ")}.`
        : undefined;
    const created = TranscriptionSchema.safeParse(
      await (
        await call("/transcriptions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: env.SONIOX_ASYNC_MODEL,
            file_id: fileId,
            language_hints: ["tl"],
            ...(context ? { context } : {}),
          }),
        })
      ).json(),
    );
    if (!created.success) {
      throw new HttpError(502, "stt_unavailable", "Speech service returned an unexpected response.");
    }
    transcriptionId = created.data.id;

    // 3. Poll until it finishes
    const deadline = Date.now() + MAX_WAIT_MS;
    for (;;) {
      const current = TranscriptionSchema.safeParse(
        await (await call(`/transcriptions/${transcriptionId}`, { method: "GET" })).json(),
      );
      if (!current.success) {
        throw new HttpError(502, "stt_unavailable", "Speech service returned an unexpected response.");
      }
      const status = current.data.status;
      if (status === "completed") {
        finished = true;
        break;
      }
      if (status === "error" || status === "failed") {
        finished = true;
        console.error("[soniox] transcription failed:", current.data.error_message ?? "no message");
        throw new HttpError(502, "stt_failed", "Could not transcribe that recording.");
      }
      if (Date.now() >= deadline) {
        throw new HttpError(504, "stt_timeout", "Speech service took too long.");
      }
      await sleep(POLL_INTERVAL_MS);
    }

    // 4. Read the transcript
    const transcript = TranscriptSchema.safeParse(
      await (await call(`/transcriptions/${transcriptionId}/transcript`, { method: "GET" })).json(),
    );
    if (!transcript.success) {
      throw new HttpError(502, "stt_unavailable", "Speech service returned an unexpected response.");
    }
    const scores = transcript.data.tokens
      .map((token) => token.confidence)
      .filter((value): value is number => typeof value === "number");
    return {
      text: transcript.data.text.trim(),
      confidence: scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null,
    };
  } finally {
    // A transcription still processing cannot be deleted, so only clean up
    // once it reached a final state. Delete the job first, then the file.
    if (finished || transcriptionId === null) {
      if (transcriptionId) await bestEffortDelete(`/transcriptions/${transcriptionId}`);
      await bestEffortDelete(`/files/${fileId}`);
    }
  }
}
