/**
 * Shortens the silence INSIDE a 16-bit mono PCM WAV (not the ends: normalize-audio trims those).
 * Used for words like "kanin" where the TTS leaves a long pause between the syllables.
 * Any quiet run in the middle that is longer than `keepMs` is cut down to `keepMs`.
 * Quiet = every sample in a 5 ms frame is below `thresholdDb` (default -40 dBFS).
 * Returns null when the file is not 16-bit mono PCM, or when no gap was long enough to cut.
 */
export function shortenInnerGaps(input: Buffer, keepMs: number, thresholdDb = -40): { out: Buffer; cutMs: number } | null {
  if (input.length < 44 || input.toString("ascii", 0, 4) !== "RIFF" || input.toString("ascii", 8, 12) !== "WAVE") return null;
  let offset = 12;
  let rate = 0;
  let ok = false;
  let dataStart = -1;
  let dataLength = 0;
  while (offset + 8 <= input.length) {
    const id = input.toString("ascii", offset, offset + 4);
    const size = input.readUInt32LE(offset + 4);
    const body = offset + 8;
    if (id === "fmt ") {
      ok = input.readUInt16LE(body) === 1 && input.readUInt16LE(body + 2) === 1 && input.readUInt16LE(body + 14) === 16;
      rate = input.readUInt32LE(body + 4);
    } else if (id === "data") {
      dataStart = body;
      dataLength = Math.min(size, input.length - body);
      break;
    }
    offset = body + size + (size % 2);
  }
  if (!ok || dataStart < 0 || rate === 0) return null;

  const total = Math.floor(dataLength / 2);
  const frame = Math.max(1, Math.round((rate * 5) / 1000));
  const limit = 32768 * 10 ** (thresholdDb / 20);
  const quiet: boolean[] = [];
  for (let start = 0; start < total; start += frame) {
    let peak = 0;
    for (let i = start; i < Math.min(total, start + frame); i += 1) peak = Math.max(peak, Math.abs(input.readInt16LE(dataStart + i * 2)));
    quiet.push(peak < limit);
  }
  const first = quiet.indexOf(false);
  const last = quiet.lastIndexOf(true) === quiet.length - 1 ? quiet.length - 1 - [...quiet].reverse().indexOf(false) : quiet.length - 1;
  if (first < 0) return null;

  const keepFrames = Math.max(1, Math.round(keepMs / 5));
  const keep: boolean[] = quiet.map(() => true);
  let cutFrames = 0;
  for (let i = first; i <= last; ) {
    if (!quiet[i]) {
      i += 1;
      continue;
    }
    let j = i;
    while (j <= last && quiet[j]) j += 1;
    const run = j - i;
    if (run > keepFrames) {
      // keep half of the allowance on each side of the gap so neither syllable is clipped
      const head = Math.ceil(keepFrames / 2);
      const tail = keepFrames - head;
      for (let k = i + head; k < j - tail; k += 1) keep[k] = false;
      cutFrames += run - keepFrames;
    }
    i = j;
  }
  if (cutFrames === 0) return null;

  const chunks: Buffer[] = [];
  for (let f = 0; f < quiet.length; f += 1) {
    if (!keep[f]) continue;
    const from = dataStart + f * frame * 2;
    chunks.push(input.subarray(from, Math.min(dataStart + dataLength, from + frame * 2)));
  }
  const data = Buffer.concat(chunks);
  const header = Buffer.from(input.subarray(0, dataStart));
  header.writeUInt32LE(data.length, dataStart - 4);
  header.writeUInt32LE(header.length - 8 + data.length, 4);
  return { out: Buffer.concat([header, data]), cutMs: cutFrames * 5 };
}

/**
 * Trims the silence at the START and END of a 16-bit mono PCM WAV down to at most `maxLeadMs` / `maxTrailMs`.
 * Quiet = every sample in a 5 ms frame is below `thresholdDb` (default -40 dBFS). Sound is never cut.
 * Returns null when the file is not 16-bit mono PCM or the ends are already short enough.
 */
export function trimEnds(input: Buffer, maxLeadMs: number, maxTrailMs: number, thresholdDb = -40): { out: Buffer; leadCutMs: number; trailCutMs: number } | null {
  if (input.length < 44 || input.toString("ascii", 0, 4) !== "RIFF" || input.toString("ascii", 8, 12) !== "WAVE") return null;
  let offset = 12;
  let rate = 0;
  let ok = false;
  let dataStart = -1;
  let dataLength = 0;
  while (offset + 8 <= input.length) {
    const id = input.toString("ascii", offset, offset + 4);
    const size = input.readUInt32LE(offset + 4);
    const body = offset + 8;
    if (id === "fmt ") {
      ok = input.readUInt16LE(body) === 1 && input.readUInt16LE(body + 2) === 1 && input.readUInt16LE(body + 14) === 16;
      rate = input.readUInt32LE(body + 4);
    } else if (id === "data") {
      dataStart = body;
      dataLength = Math.min(size, input.length - body);
      break;
    }
    offset = body + size + (size % 2);
  }
  if (!ok || dataStart < 0 || rate === 0) return null;
  const total = Math.floor(dataLength / 2);
  const limit = 32768 * 10 ** (thresholdDb / 20);
  const frame = Math.max(1, Math.round((rate * 5) / 1000));
  let firstSound = -1;
  let lastSound = -1;
  for (let start = 0; start < total; start += frame) {
    let peak = 0;
    for (let i = start; i < Math.min(total, start + frame); i += 1) peak = Math.max(peak, Math.abs(input.readInt16LE(dataStart + i * 2)));
    if (peak >= limit) {
      if (firstSound < 0) firstSound = start;
      lastSound = Math.min(total, start + frame);
    }
  }
  if (firstSound < 0) return null;
  const leadKeep = Math.round((rate * maxLeadMs) / 1000);
  const trailKeep = Math.round((rate * maxTrailMs) / 1000);
  const from = Math.max(0, firstSound - leadKeep);
  const to = Math.min(total, lastSound + trailKeep);
  if (from === 0 && to === total) return null;
  const data = input.subarray(dataStart + from * 2, dataStart + to * 2);
  const header = Buffer.from(input.subarray(0, dataStart));
  header.writeUInt32LE(data.length, dataStart - 4);
  header.writeUInt32LE(header.length - 8 + data.length, 4);
  return { out: Buffer.concat([header, data]), leadCutMs: Math.round((from * 1000) / rate), trailCutMs: Math.round(((total - to) * 1000) / rate) };
}
