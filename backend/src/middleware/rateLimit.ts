import type { Request } from "express";
import { rateLimit } from "express-rate-limit";

/**
 * Per-user limiter for routes that cost money or mint credentials.
 * Must be mounted AFTER requireAuth so req.auth is set.
 */
export function perUserLimiter(options: { windowMs: number; limit: number }) {
  return rateLimit({
    windowMs: options.windowMs,
    limit: options.limit,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    keyGenerator: (req: Request) => req.auth?.userId ?? "anonymous",
    validate: { keyGeneratorIpFallback: false },
    handler: (_req, res) => {
      res.status(429).json({
        error: { code: "rate_limited", message: "Too many requests. Please wait a moment." },
      });
    },
  });
}
