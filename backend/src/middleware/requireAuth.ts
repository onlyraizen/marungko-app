import type { Request, RequestHandler, Response } from "express";
import {
  createRemoteJWKSet,
  errors,
  jwtVerify,
  type JWTPayload,
  type JWTVerifyGetKey,
  type JWTVerifyOptions,
} from "jose";
import { env } from "../config/env.js";

/**
 * Verifies Supabase access tokens LOCALLY (signature, issuer, audience, expiry)
 * with no database or Supabase API call per request.
 *
 * - Modern projects (asymmetric signing keys, ES256/RS256): verified against the
 *   project's JWKS endpoint. jose caches the key set in memory and only refetches
 *   when it sees an unknown `kid` (key rotation), at most once per cooldown window.
 * - Legacy projects (HS256): verified with SUPABASE_JWT_SECRET, only if configured.
 *   The key is chosen by the token's algorithm header, and jose enforces that the
 *   key type matches the alg, so HS256/RS256 confusion attacks don't work.
 */

export interface AuthContext {
  /** Supabase auth user id (the JWT `sub`). */
  userId: string;
  email: string | null;
  sessionId: string | null;
  isAnonymous: boolean;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: AuthContext;
    }
  }
}

const MAX_TOKEN_LENGTH = 8192;
const BEARER_PATTERN = /^Bearer\s+(\S+)$/i;

const jwks = createRemoteJWKSet(new URL(env.SUPABASE_JWKS_URL), {
  timeoutDuration: 5_000,
  cooldownDuration: 30_000,
  cacheMaxAge: 10 * 60_000,
});

const legacySecret = env.SUPABASE_JWT_SECRET
  ? new TextEncoder().encode(env.SUPABASE_JWT_SECRET)
  : undefined;

const resolveKey: JWTVerifyGetKey = async (header, token) => {
  if (header.alg === "HS256") {
    if (!legacySecret) {
      throw new errors.JWSSignatureVerificationFailed(
        "HS256 tokens are not accepted: no legacy JWT secret is configured",
      );
    }
    return legacySecret;
  }
  return jwks(header, token);
};

const VERIFY_OPTIONS: JWTVerifyOptions = {
  issuer: env.SUPABASE_JWT_ISSUER,
  audience: "authenticated",
  algorithms: ["ES256", "RS256", "HS256"],
  requiredClaims: ["sub", "exp"],
  clockTolerance: "5s",
};

function extractBearerToken(header: string | undefined): string | null {
  if (!header) return null;
  const match = BEARER_PATTERN.exec(header.trim());
  const token = match?.[1];
  if (!token || token.length > MAX_TOKEN_LENGTH) return null;
  return token;
}

function toAuthContext(payload: JWTPayload): AuthContext | null {
  // The anon/service keys are JWTs too; only real signed-in users have role=authenticated.
  if (typeof payload.sub !== "string" || payload.role !== "authenticated") {
    return null;
  }
  return {
    userId: payload.sub,
    email: typeof payload.email === "string" ? payload.email : null,
    sessionId: typeof payload.session_id === "string" ? payload.session_id : null,
    isAnonymous: payload.is_anonymous === true,
  };
}

function sendError(res: Response, status: 401 | 503, code: string, message: string): void {
  if (status === 401) {
    res.setHeader(
      "WWW-Authenticate",
      code === "missing_token" ? "Bearer" : 'Bearer error="invalid_token"',
    );
  } else {
    res.setHeader("Retry-After", "5");
  }
  res.status(status).json({ error: { code, message } });
}

function respondToVerifyError(error: unknown, res: Response): void {
  if (error instanceof errors.JWTExpired) {
    sendError(res, 401, "token_expired", "Access token has expired. Refresh the session and retry.");
    return;
  }

  // Failing to fetch signing keys is OUR availability problem, not a bad token.
  // 503 (not 401) so the app doesn't sign the user out over a transient outage.
  const keySetUnavailable =
    error instanceof errors.JWKSTimeout ||
    (error instanceof errors.JOSEError && error.code === "ERR_JOSE_GENERIC");
  if (keySetUnavailable || !(error instanceof errors.JOSEError)) {
    console.error(
      "[auth] could not verify token (signing keys unavailable?):",
      error instanceof Error ? error.message : error,
    );
    sendError(res, 503, "auth_unavailable", "Authentication is temporarily unavailable.");
    return;
  }

  sendError(res, 401, "invalid_token", "Invalid access token.");
}

/** Rejects the request unless it carries a valid Supabase access token. Sets `req.auth`. */
export const requireAuth: RequestHandler = async (req, res, next) => {
  const token = extractBearerToken(req.header("authorization"));
  if (!token) {
    sendError(res, 401, "missing_token", "Missing or malformed Authorization header.");
    return;
  }

  try {
    const { payload } = await jwtVerify(token, resolveKey, VERIFY_OPTIONS);
    const auth = toAuthContext(payload);
    if (!auth) {
      sendError(res, 401, "invalid_token", "Invalid access token.");
      return;
    }
    req.auth = auth;
    next();
  } catch (error) {
    respondToVerifyError(error, res);
  }
};

/** Use inside handlers behind requireAuth to get a non-optional AuthContext. */
export function getAuth(req: Request): AuthContext {
  if (!req.auth) {
    throw new Error("getAuth() called on a route that is not protected by requireAuth");
  }
  return req.auth;
}
