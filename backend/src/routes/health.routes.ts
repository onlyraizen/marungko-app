import { Router } from "express";
import { env } from "../config/env.js";

export const healthRouter = Router();

/** Fast liveness probe for Railway. Does no outbound calls. */
healthRouter.get("/health", (_req, res) => {
  res.json({ status: "ok", uptimeSeconds: Math.round(process.uptime()) });
});

/**
 * Deeper check for defense-day rehearsal: can we reach Supabase's signing keys?
 * (Run it yourself; don't point Railway's healthcheck here.)
 */
healthRouter.get("/health/deep", async (_req, res) => {
  let supabaseKeys = false;
  try {
    const response = await fetch(env.SUPABASE_JWKS_URL, { signal: AbortSignal.timeout(4_000) });
    supabaseKeys = response.ok;
  } catch {
    supabaseKeys = false;
  }

  res.status(supabaseKeys ? 200 : 503).json({
    status: supabaseKeys ? "ok" : "degraded",
    checks: { supabaseJwks: supabaseKeys },
  });
});
