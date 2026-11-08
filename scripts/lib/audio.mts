import { readFileSync } from "node:fs";

// Shared audio measurements for the syllable scripts. 16-bit PCM WAV only.

export type Wav = { samples: Float32Array; rate: number };

export function readWav(path: string): Wav | null {
  const buffer = readFileSync(path);
  if (buffer.length < 44 || buffer.toString("ascii", 0, 4) !== "RIFF") return null;
  let offset = 12;
  let rate = 0;
  let bits = 0;
  let channels = 1;
  while (offset + 8 <= buffer.length) {
    const id = buffer.toString("ascii", offset, offset + 4);
    const size = buffer.readUInt32LE(offset + 4);
    const body = offset + 8;
    if (id === "fmt ") {
      channels = buffer.readUInt16LE(body + 2);
      rate = buffer.readUInt32LE(body + 4);
      bits = buffer.readUInt16LE(body + 14);
    } else if (id === "data") {
      if (bits !== 16) return null;
      const length = size === 0 || size > buffer.length - body ? buffer.length - body : size;
      const frames = Math.floor(length / (2 * channels));
      const samples = new Float32Array(frames);
      for (let i = 0; i < frames; i += 1) samples[i] = buffer.readInt16LE(body + i * 2 * channels) / 32768;
      return { samples, rate };
    }
    offset = body + size + (size % 2);
  }
  return null;
}

const toDb = (value: number): number => (value <= 1e-6 ? -120 : 20 * Math.log10(value));

export type Measure = {
  seconds: number;
  leadMs: number;
  tailMs: number;
  peakDb: number;
  rmsDb: number;
  beats: number;
  pitchHz: number | null;
  pitchMove: number | null; // semitones, last third minus first third of the voiced part
};

export function measure({ samples, rate }: Wav): Measure {
  const hop = Math.round(rate * 0.01);
  const count = Math.floor(samples.length / hop);
  let peak = 0;
  for (const value of samples) peak = Math.max(peak, Math.abs(value));
  const env: number[] = [];
  for (let f = 0; f < count; f += 1) {
    let sum = 0;
    for (let i = f * hop; i < (f + 1) * hop; i += 1) sum += samples[i] * samples[i];
    env.push(toDb(Math.sqrt(sum / hop)));
  }
  const maxEnv = Math.max(...env);
  const gate = Math.max(maxEnv - 40, -60); // "sound" means within 40 dB of the loudest part
  const first = env.findIndex((value) => value > gate);
  const last = env.length - 1 - [...env].reverse().findIndex((value) => value > gate);
  const leadMs = first < 0 ? 0 : first * 10;
  const tailMs = last < 0 ? 0 : (env.length - 1 - last) * 10 + (samples.length - count * hop) / rate * 1000;

  // Loudness over the sound part only (what normalize-audio targets).
  let sum = 0;
  let n = 0;
  for (let f = Math.max(first, 0); f <= last; f += 1) {
    if (env[f] > maxEnv - 25) {
      for (let i = f * hop; i < (f + 1) * hop; i += 1) sum += samples[i] * samples[i];
      n += hop;
    }
  }
  const rmsDb = n > 0 ? toDb(Math.sqrt(sum / n)) : -120;

  // Beats: peaks of the smoothed loudness curve that are separated by a clear dip. One syllable = one beat.
  const smooth = env.map((_, f) => {
    const slice = env.slice(Math.max(0, f - 1), f + 2);
    return slice.reduce((a, b) => a + b, 0) / slice.length;
  });
  let beats = 0;
  let climbing = true;
  let top = -Infinity;
  let valley = Infinity;
  for (let f = Math.max(first, 0); f <= last; f += 1) {
    const value = smooth[f];
    if (value < maxEnv - 30) continue;
    if (climbing) {
      if (value > top) top = value;
      else if (top - value >= 7) {
        beats += 1;
        climbing = false;
        valley = value;
      }
    } else {
      if (value < valley) valley = value;
      else if (value - valley >= 7 && value > maxEnv - 22) {
        climbing = true;
        top = value;
      }
    }
  }
  if (climbing && top > -Infinity) beats += 1;

  // Pitch: strongest repeat period between 70 and 400 Hz, on the loud frames only.
  const win = Math.round(rate * 0.04);
  const minLag = Math.round(rate / 400);
  const maxLag = Math.round(rate / 70);
  const pitches: { t: number; hz: number }[] = [];
  for (let f = Math.max(first, 0); f <= last; f += 1) {
    if (env[f] < maxEnv - 20) continue;
    const start = f * hop;
    if (start + win + maxLag >= samples.length) break;
    let energy = 0;
    for (let i = 0; i < win; i += 1) energy += samples[start + i] * samples[start + i];
    if (energy < 1e-6) continue;
    let bestLag = 0;
    let best = 0;
    for (let lag = minLag; lag <= maxLag; lag += 1) {
      let cross = 0;
      let other = 0;
      for (let i = 0; i < win; i += 1) {
        cross += samples[start + i] * samples[start + i + lag];
        other += samples[start + i + lag] * samples[start + i + lag];
      }
      const score = cross / Math.sqrt(energy * other + 1e-12);
      if (score > best) {
        best = score;
        bestLag = lag;
      }
    }
    if (best > 0.6 && bestLag > 0) pitches.push({ t: f, hz: rate / bestLag });
  }
  let pitchHz: number | null = null;
  let pitchMove: number | null = null;
  if (pitches.length >= 6) {
    const hz = pitches.map((p) => p.hz).sort((a, b) => a - b);
    pitchHz = hz[Math.floor(hz.length / 2)];
    const med = (list: number[]): number => [...list].sort((a, b) => a - b)[Math.floor(list.length / 2)];
    const third = Math.floor(pitches.length / 3);
    const head = med(pitches.slice(0, third).map((p) => p.hz));
    const tail = med(pitches.slice(pitches.length - third).map((p) => p.hz));
    pitchMove = 12 * Math.log2(tail / head);
  }
  return { seconds: samples.length / rate, leadMs, tailMs, peakDb: toDb(peak), rmsDb, beats, pitchHz, pitchMove };
}


const clampSample = (value: number): number => Math.max(-32768, Math.min(32767, Math.round(value * 32768)));

/** Mono 16-bit WAV file bytes. */
export function encodeWav(samples: Float32Array, rate: number): Buffer {
  const out = Buffer.alloc(44 + samples.length * 2);
  out.write("RIFF", 0, "ascii");
  out.writeUInt32LE(36 + samples.length * 2, 4);
  out.write("WAVEfmt ", 8, "ascii");
  out.writeUInt32LE(16, 16);
  out.writeUInt16LE(1, 20);
  out.writeUInt16LE(1, 22);
  out.writeUInt32LE(rate, 24);
  out.writeUInt32LE(rate * 2, 28);
  out.writeUInt16LE(2, 32);
  out.writeUInt16LE(16, 34);
  out.write("data", 36, "ascii");
  out.writeUInt32LE(samples.length * 2, 40);
  for (let i = 0; i < samples.length; i += 1) out.writeInt16LE(clampSample(samples[i]), 44 + i * 2);
  return out;
}

/** Loudness of every 10 ms frame in dB. */
export function envelope(samples: Float32Array, rate: number): number[] {
  const hop = Math.round(rate * 0.01);
  const out: number[] = [];
  for (let f = 0; f + 1 <= Math.floor(samples.length / hop); f += 1) {
    let sum = 0;
    for (let i = f * hop; i < (f + 1) * hop; i += 1) sum += samples[i] * samples[i];
    out.push(20 * Math.log10(Math.sqrt(sum / hop) + 1e-9));
  }
  return out;
}

/** Splits a clip into the sounds between silences (gaps of at least `gapMs`). Times are in samples. */
export function sounds(samples: Float32Array, rate: number, gapMs: number): { start: number; end: number }[] {
  const hop = Math.round(rate * 0.01);
  const env = envelope(samples, rate);
  const gate = Math.max(Math.max(...env) - 35, -60);
  const out: { start: number; end: number }[] = [];
  let start = -1;
  let quiet = 0;
  for (let f = 0; f < env.length; f += 1) {
    if (env[f] > gate) {
      if (start < 0) start = f;
      quiet = 0;
    } else if (start >= 0) {
      quiet += 1;
      if (quiet * 10 >= gapMs) {
        out.push({ start: start * hop, end: (f - quiet + 1) * hop });
        start = -1;
        quiet = 0;
      }
    }
  }
  if (start >= 0) out.push({ start: start * hop, end: (env.length - quiet) * hop });
  return out;
}

/**
 * Cuts one sound out with a little room on each side, fades the cut edges (no click), and sets the loudness of
 * the sound part to `rmsDb` without going over -1 dB peak.
 */
export function cut(samples: Float32Array, rate: number, start: number, end: number, leadMs: number, tailMs: number, rmsDb: number): Float32Array {
  const lead = Math.round((rate * leadMs) / 1000);
  const tail = Math.round((rate * tailMs) / 1000);
  const from = Math.max(0, start - Math.round(rate * 0.006));
  const to = Math.min(samples.length, end + Math.round(rate * 0.012));
  const body = Float32Array.from(samples.subarray(from, to));
  const fadeIn = Math.min(body.length, Math.round(rate * 0.004));
  const fadeOut = Math.min(body.length, Math.round(rate * 0.012));
  for (let i = 0; i < fadeIn; i += 1) body[i] *= i / fadeIn;
  for (let i = 0; i < fadeOut; i += 1) body[body.length - 1 - i] *= i / fadeOut;
  let sum = 0;
  let peak = 0;
  for (const v of body) {
    sum += v * v;
    peak = Math.max(peak, Math.abs(v));
  }
  const rms = Math.sqrt(sum / Math.max(1, body.length));
  let gain = rms > 0 ? Math.pow(10, rmsDb / 20) / rms : 1;
  if (peak * gain > 0.89) gain = 0.89 / peak; // -1 dB
  const out = new Float32Array(lead + body.length + tail);
  for (let i = 0; i < body.length; i += 1) out[lead + i] = body[i] * gain;
  return out;
}
