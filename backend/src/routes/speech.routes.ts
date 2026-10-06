import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/requireAuth.js";
import { perUserLimiter } from "../middleware/rateLimit.js";
import { mintTemporaryKey } from "../services/soniox.service.js";

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
