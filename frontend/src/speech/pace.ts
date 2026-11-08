/**
 * How fast did the child say it? Speech recognition only returns TEXT: "pato" said in 0.2 s and "pato" said in
 * 0.6 s both come back as "pato". So the app measures the pace itself, from the microphone loudness, and
 * compares it with how long a calm, clear "pato" takes.
 *
 * Only a number per 10 ms is kept (loudness in dB), never the audio. Nothing here leaves the phone.
 * No React Native imports: the same file is run by scripts/pace-test.mts.
 *
 * What this can and cannot tell: it measures how long the child was making sound between the first and the last
 * sound. It cannot tell whether each sound was clear, only that the whole word was not squeezed into a blur.
 */

export const FRAME_SAMPLES = 160; // 10 ms at 16 kHz
export const FRAME_MS = 10;
const MAX_FRAMES = 1500; // 15 s

// Voice activity (starting values; see docs/SPEECH-CHECK.md section 2).
const GATE_BELOW_PEAK_DB = 28; // "sound" is within 28 dB of the loudest part
const ABSOLUTE_FLOOR_DB = -55; // never count anything quieter than this
const MIN_PEAK_DB = -45; // if the loudest frame is quieter than this there was no speech
const MERGE_GAP_MS = 150; // gaps shorter than this are inside the word (the "p" of "pato" is a closure)
const MIN_RUN_MS = 50; // a lone blip shorter than this and far from speech is a click, not speech
const LONE_BLIP_DISTANCE_MS = 250;

/** Collects the loudness of each 10 ms of microphone audio (16 kHz, 16-bit mono). Keeps no audio. */
export class PaceMeter {
  readonly frames: number[] = [];
  private sum = 0;
  private count = 0;

  reset(): void {
    this.frames.length = 0;
    this.sum = 0;
    this.count = 0;
  }

  /** Feed one chunk of 16-bit samples exactly as the microphone delivers it. */
  push(samples: Int16Array): void {
    for (let i = 0; i < samples.length; i += 1) {
      const value = samples[i] ?? 0;
      this.sum += value * value;
      this.count += 1;
      if (this.count === FRAME_SAMPLES) {
        const rms = Math.sqrt(this.sum / FRAME_SAMPLES) / 32768;
        if (this.frames.length < MAX_FRAMES) this.frames.push(20 * Math.log10(rms + 1e-9));
        this.sum = 0;
        this.count = 0;
      }
    }
  }
}

export type Span = {
  /** First sound, in ms from the start of listening. */
  startMs: number;
  endMs: number;
  /** First sound to last sound. This is the "how long was the word" number. */
  spanMs: number;
  /** Loudest frame, dBFS. */
  peakDb: number;
};

/** When did the child start and stop making sound? null when nothing that sounds like speech was heard. */
export function findSpan(frames: readonly number[]): Span | null {
  if (frames.length < 5) return null;
  let peak = -120;
  for (const value of frames) if (value > peak) peak = value;
  if (peak < MIN_PEAK_DB) return null;
  const gate = Math.max(peak - GATE_BELOW_PEAK_DB, ABSOLUTE_FLOOR_DB);

  let runs: { from: number; to: number }[] = [];
  let from = -1;
  for (let f = 0; f <= frames.length; f += 1) {
    const loud = f < frames.length && (frames[f] ?? -120) > gate;
    if (loud && from < 0) from = f;
    if (!loud && from >= 0) {
      runs.push({ from, to: f });
      from = -1;
    }
  }
  const mergeGap = MERGE_GAP_MS / FRAME_MS;
  const merged: { from: number; to: number }[] = [];
  for (const run of runs) {
    const last = merged[merged.length - 1];
    if (last && run.from - last.to <= mergeGap) last.to = run.to;
    else merged.push({ ...run });
  }
  const minRun = MIN_RUN_MS / FRAME_MS;
  const far = LONE_BLIP_DISTANCE_MS / FRAME_MS;
  runs = merged.filter((run, index) => {
    if (run.to - run.from >= minRun) return true;
    const before = merged[index - 1];
    const after = merged[index + 1];
    const nearest = Math.min(before ? run.from - before.to : Infinity, after ? after.from - run.to : Infinity);
    return nearest < far;
  });
  const first = runs[0];
  const last = runs[runs.length - 1];
  if (!first || !last) return null;
  return { startMs: first.from * FRAME_MS, endMs: last.to * FRAME_MS, spanMs: (last.to - first.from) * FRAME_MS, peakDb: peak };
}

/**
 * How long a calm, clear word takes, by number of syllables: first sound to last sound, measured on the guide
 * voice's own clips (scripts/pace-test.mts prints the table). A child may be slower; nobody is penalised for that.
 */
export const EXPECTED_MS: Readonly<Record<number, number>> = { 1: 330, 2: 560, 3: 780, 4: 1000, 5: 1220 };

export function expectedMs(syllables: number): number {
  const known = EXPECTED_MS[syllables];
  if (known !== undefined) return known;
  return Math.round(330 + 220 * Math.max(0, syllables - 1));
}

export type PaceSettings = {
  /** Faster than this share of the calm time counts as rushed (2+ syllables). 0.6 = about 1.7x too fast. */
  minRatio: number;
  /** Never more syllables per second than a person can clearly say (2+ syllables). */
  maxSyllablesPerSecond: number;
  /** Shortest possible time per syllable, any word. Under this it is a click or a blur, not a syllable. */
  floorMsPerSyllable: number;
};

export const PACE_PRESETS = {
  lenient: { minRatio: 0.5, maxSyllablesPerSecond: 8, floorMsPerSyllable: 90 },
  balanced: { minRatio: 0.6, maxSyllablesPerSecond: 7.5, floorMsPerSyllable: 100 },
  strict: { minRatio: 0.7, maxSyllablesPerSecond: 6.5, floorMsPerSyllable: 110 },
} as const satisfies Record<string, PaceSettings>;

export type PaceVerdict = {
  rushed: boolean;
  syllables: number;
  spanMs: number;
  expectedMs: number;
  ratio: number;
  syllablesPerSecond: number;
  why: "ok" | "too-short" | "too-fast";
};

/**
 * `modelMs` is how long the guide voice's own clip of THIS word takes (first sound to last sound): words differ
 * (a word with "ng" or two vowels together is not the same length as "pato"), so the word's own clip is the best
 * yardstick. Without it the table by syllable count is used.
 */
export function judgePace(syllables: number, spanMs: number, settings: PaceSettings = PACE_PRESETS.balanced, modelMs?: number): PaceVerdict {
  const count = Math.max(1, syllables);
  const expected = modelMs !== undefined && modelMs > 0 ? modelMs : expectedMs(count);
  const ratio = spanMs / expected;
  const sps = spanMs > 0 ? count / (spanMs / 1000) : Infinity;
  let why: PaceVerdict["why"] = "ok";
  if (spanMs < settings.floorMsPerSyllable * count) why = "too-short";
  else if (count >= 2 && (ratio < settings.minRatio || sps > settings.maxSyllablesPerSecond)) why = "too-fast";
  return { rushed: why !== "ok", syllables: count, spanMs, expectedMs: expected, ratio, syllablesPerSecond: sps, why };
}
