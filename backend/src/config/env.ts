import { z } from "zod";

/**
 * Environment validation for the Express backend (zod v4).
 *
 * - Runs once at import time. If anything is missing or malformed, the process
 *   prints a readable error (variable names and reasons, never values) and exits
 *   with code 1, so a misconfigured deploy fails at boot instead of mid-defense.
 * - Blank values (e.g. `SONIOX_API_KEY=`) are treated as missing.
 * - Obvious placeholder values copied from docs are rejected for secrets.
 */

const PLACEHOLDER_PATTERN = /^(changeme|change_me|your[-_ ]|x{3,}|todo)/i;

const secret = z
  .string()
  .trim()
  .min(1)
  .refine((value) => !PLACEHOLDER_PATTERN.test(value), {
    message: "Looks like a placeholder value, not a real secret",
  });

const positiveInt = (min: number, max: number) =>
  z.coerce.number().int().min(min).max(max);

const EnvSchema = z
  .object({
    // --- Runtime ---
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: positiveInt(1, 65535).default(3000),
    // Native apps ignore CORS; this only matters for web/dev tooling.
    CORS_ORIGINS: z
      .string()
      .optional()
      .transform((value) =>
        (value ?? "")
          .split(",")
          .map((origin) => origin.trim())
          .filter(Boolean),
      ),

    // --- Supabase ---
    SUPABASE_URL: z
      .url({ protocol: /^https?$/ })
      .transform((value) => value.replace(/\/+$/, "")),
    SUPABASE_SERVICE_ROLE_KEY: secret,
    // Only set if you use a custom auth domain (the token's `iss` differs from the default).
    SUPABASE_JWT_ISSUER: z.url().optional(),
    // Only set for LEGACY projects whose tokens are signed with HS256.
    SUPABASE_JWT_SECRET: secret.optional(),

    // --- ElevenLabs (TTS) ---
    ELEVENLABS_API_KEY: secret,
    ELEVENLABS_VOICE_ID: secret,
    ELEVENLABS_MODEL_ID: z.string().trim().min(1).default("eleven_multilingual_v2"),

    // --- Soniox (STT) ---
    SONIOX_API_KEY: secret,
    SONIOX_TEMP_KEY_TTL_SECONDS: positiveInt(1, 3600).default(60),
    SONIOX_MAX_SESSION_SECONDS: positiveInt(1, 3600).default(60),
    SONIOX_ASYNC_MODEL: z.string().trim().min(1),
  })
  .refine(
    (env) => env.NODE_ENV !== "production" || env.SUPABASE_URL.startsWith("https://"),
    { message: "SUPABASE_URL must use https in production", path: ["SUPABASE_URL"] },
  )
  .transform((env) => ({
    ...env,
    IS_PRODUCTION: env.NODE_ENV === "production",
    SUPABASE_JWT_ISSUER: env.SUPABASE_JWT_ISSUER ?? `${env.SUPABASE_URL}/auth/v1`,
    SUPABASE_JWKS_URL: `${env.SUPABASE_URL}/auth/v1/.well-known/jwks.json`,
  }));

export type Env = Readonly<z.output<typeof EnvSchema>>;

/**
 * Pure parser (handy in tests). Throws an Error whose message lists every
 * invalid variable by name; it never includes the offending values.
 */
export function loadEnv(source: NodeJS.ProcessEnv): Env {
  const cleaned: Record<string, string> = {};
  for (const [key, value] of Object.entries(source)) {
    if (value !== undefined && value.trim() !== "") {
      cleaned[key] = value;
    }
  }

  const result = EnvSchema.safeParse(cleaned);
  if (!result.success) {
    throw new Error(`Invalid environment configuration:\n${z.prettifyError(result.error)}`);
  }
  return Object.freeze(result.data);
}

function bootEnv(): Env {
  try {
    return loadEnv(process.env);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    console.error("\nFix the variables above (see backend/.env.example) and restart.");
    process.exit(1);
  }
}

export const env: Env = bootEnv();
