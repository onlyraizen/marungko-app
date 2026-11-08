import { matchUtterance, type MatchResult } from "@marungko/shared";
import { PACE_PRESETS, judgePace, type PaceSettings, type PaceVerdict } from "./pace";

/**
 * One spoken attempt, judged in layers (docs/SPEECH-CHECK.md section 3):
 *
 *   1. text: the words match the target or one of its accepted spellings (matchUtterance, exact once case,
 *      punctuation and spaces are ignored)
 *   2. confidence: how sure the speech service was (observed and logged; only enforced when switched on)
 *   3. pace: the word was not squeezed into a blur (measured from the microphone, see pace.ts)
 *
 * Only a text match can pass. Pace and confidence can turn a pass into "almost" (a kind retry), never into a
 * hard fail, and never turn a wrong word into a pass.
 */

export type Reason = "ok" | "too-fast" | "low-confidence" | "near" | "wrong" | "silent";

export type AttemptInput = {
  heard: string;
  target: string;
  accepted: readonly string[];
  syllables: number;
  /** First sound to last sound in the microphone audio, or null when it could not be measured. */
  spanMs: number | null;
  /** How long the guide voice's clip of this word is, if known. */
  modelMs?: number;
  /** Mean confidence of the recognised words, 0 to 1, or null. */
  confidence: number | null;
};

export type AttemptConfig = {
  /** null switches the pace guard off. */
  pace: PaceSettings | null;
  /** Turn a low-confidence match into "almost". Off until it is calibrated on real recordings. */
  confidenceEnforced: boolean;
  confidenceMin: (syllables: number) => number;
};

export type AttemptDecision = {
  result: MatchResult;
  reason: Reason;
  pace: PaceVerdict | null;
  lowConfidence: boolean;
};

const MODES = { off: null, ...PACE_PRESETS } as const;

/** EXPO_PUBLIC_PACE_MODE=off | lenient | balanced | strict (balanced when missing). */
function modeFromEnv(): PaceSettings | null {
  const raw = typeof process !== "undefined" ? process.env?.EXPO_PUBLIC_PACE_MODE : undefined;
  const key = (raw ?? "balanced").trim().toLowerCase();
  return key in MODES ? (MODES as Record<string, PaceSettings | null>)[key] ?? null : PACE_PRESETS.balanced;
}

export const DEFAULT_CONFIG: AttemptConfig = {
  pace: modeFromEnv(),
  confidenceEnforced: false,
  // Starting values: nothing in the Soniox docs recommends a threshold. Calibrate (docs/SPEECH-CHECK.md section 8).
  confidenceMin: (syllables) => (syllables <= 1 ? 0.3 : syllables === 2 ? 0.4 : 0.45),
};

export function decideAttempt(input: AttemptInput, config: AttemptConfig = DEFAULT_CONFIG): AttemptDecision {
  const matched = matchUtterance(input.heard, input.target, input.accepted);
  if (matched.kind === "incorrect") {
    return { result: matched, reason: matched.heard === "" ? "silent" : "wrong", pace: null, lowConfidence: false };
  }
  if (matched.kind === "almost") return { result: matched, reason: "near", pace: null, lowConfidence: false };

  const lowConfidence = input.confidence !== null && input.confidence < config.confidenceMin(input.syllables);
  const pace = config.pace !== null && input.spanMs !== null ? judgePace(input.syllables, input.spanMs, config.pace, input.modelMs) : null;
  if (pace?.rushed) return { result: { ...matched, kind: "almost" }, reason: "too-fast", pace, lowConfidence };
  if (lowConfidence && config.confidenceEnforced) return { result: { ...matched, kind: "almost" }, reason: "low-confidence", pace, lowConfidence };
  return { result: matched, reason: "ok", pace, lowConfidence };
}
