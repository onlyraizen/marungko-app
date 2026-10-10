import express, { Router } from "express";
import { z } from "zod";
import { normalizeUtterance } from "@marungko/shared";
import { HttpError } from "../lib/httpError.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { perUserLimiter } from "../middleware/rateLimit.js";
import { mintTemporaryKey } from "../services/soniox.service.js";
import { transcribeClip } from "../services/sonioxAsync.service.js";

export const speechRouter = Router();

// Phase 1 spike: the client may send up to 50 target words/syllables to bias
// recognition. Phase 2 replaces this with a server-side lookup by exerciseId.
const SessionBodySchema = z.object({
  terms: z.array(z.string().trim().min(1).max(40)).max(50).default([]),
});

speechRouter.post(
  "/speech/session",
  requireAuth,
  perUserLimiter({ windowMs: 60_000, limit: 20 }),
  async (req, res) => {
    const body = SessionBodySchema.parse(req.body ?? {});
    const key = await mintTemporaryKey();

    res.json({
      apiKey: key.apiKey,
      expiresAt: key.expiresAt,
      languageHints: ["tl"],
      terms: body.terms,
    });
  },
);

const TermsQuerySchema = z.object({
  terms: z
    .string()
    .max(1000)
    .optional()
    .transform((value) =>
      (value ?? "")
        .split(",")
        .map((term) => term.trim())
        .filter((term) => term.length > 0 && term.length <= 40)
        .slice(0, 50),
    ),
});

const EXTENSIONS: Record<string, string> = {
  "audio/mp4": "m4a",
  "audio/m4a": "m4a",
  "audio/x-m4a": "m4a",
  "audio/aac": "aac",
  "audio/mpeg": "mp3",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/webm": "webm",
  "audio/ogg": "ogg",
};

/**
 * Fallback for devices that can't stream live audio (Expo Go on iPhone):
 * the app uploads one short recorded clip as the raw request body.
 * POST /api/v1/speech/transcribe?terms=ma,me,mi   Content-Type: audio/mp4
 */
speechRouter.post(
  "/speech/transcribe",
  requireAuth,
  perUserLimiter({ windowMs: 60_000, limit: 30 }),
  express.raw({ type: ["audio/*", "application/octet-stream"], limit: "2mb" }),
  async (req, res) => {
    const audio: unknown = req.body;
    if (!Buffer.isBuffer(audio) || audio.length === 0) {
      throw new HttpError(400, "audio_required", "Send the recording as the request body.");
    }

    const { terms } = TermsQuerySchema.parse({
      terms: typeof req.query.terms === "string" ? req.query.terms : undefined,
    });

    const contentType = (req.header("content-type") ?? "").split(";")[0]?.trim().toLowerCase() ?? "";
    const filename = `clip.${EXTENSIONS[contentType] ?? "m4a"}`;

    const result = await transcribeClip(audio, filename, terms);
    res.json({
      text: result.text,
      normalized: normalizeUtterance(result.text),
      confidence: result.confidence,
    });
  },
);
