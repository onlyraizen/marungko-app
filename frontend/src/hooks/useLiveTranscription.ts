import { requestRecordingPermissionsAsync, setAudioModeAsync, useAudioStream } from "expo-audio";
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../services/supabase";

const API_URL = process.env.EXPO_PUBLIC_API_URL;
const STT_URL = "wss://stt-rt.soniox.com/transcribe-websocket";
const STT_MODEL = "stt-rt-v5";

// Hands-free stopping. Soniox sends an "<end>" token when it decides the speaker is done.
// If it ends too early (cuts the child off), lower the level to 0 or raise the delay.
// If it feels slow, raise the level (max 3) or lower the delay (min 500).
// Children in Grades 1 to 3 read slowly and pause between sounds, so the endpoint is patient. A correct answer is
// still accepted quickly: LessonScreen stops the stream 450 ms after the text already matches (EARLY_ACCEPT_MS).
const ENDPOINT_LATENCY_LEVEL = 2; // 0 default, 1 to 3 faster (Soniox docs: higher can cut speech into more segments)
const MAX_ENDPOINT_DELAY_MS = 1000; // 500 to 3000; Soniox default is 2000
const ENDPOINT_SENSITIVITY = 0; // -1 to 1; higher means it ends sooner. Do not go negative with a level above 0.
// Safety nets, because "<end>" never comes if the child says nothing.
const NO_SPEECH_MS = 7000;
const MAX_LISTEN_MS = 12000;

// Backend speech keys are valid for 60 s and single-use; reuse a prepared one only while it is fresh.
const KEY_MAX_AGE_MS = 40_000;
// Audio held while the connection opens: 10 s of 16 kHz 16-bit mono. Far more than needed.
const MAX_QUEUED_BYTES = 320_000;

type Token = { text?: string; is_final?: boolean; confidence?: number };
type SonioxMessage = {
  tokens?: Token[];
  finished?: boolean;
  error_code?: number;
  error_type?: string;
  error_message?: string;
};

async function fetchSpeechKey(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token;
  if (!API_URL || !accessToken) throw new Error("Not signed in, or EXPO_PUBLIC_API_URL is missing.");

  const response = await fetch(`${API_URL}/api/v1/speech/session`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ terms: [] }),
  });
  if (!response.ok) throw new Error(`Backend refused the speech key (HTTP ${response.status}).`);

  const body: unknown = await response.json();
  if (typeof body === "object" && body !== null && "apiKey" in body) {
    const value = (body as { apiKey: unknown }).apiKey;
    if (typeof value === "string" && value.length > 0) return value;
  }
  throw new Error("Backend reply had no speech key.");
}

/**
 * Live microphone -> Soniox WebSocket -> text, hands-free.
 *
 * The child taps once. Soniox detects when they stop speaking (the "<end>" token) and the
 * result is ready by itself. If nothing is said, it gives up after NO_SPEECH_MS.
 *
 * Call prepare() while the child is looking at the word: it asks for microphone permission
 * once and fetches the speech key ahead of time, so start() is quick.
 *
 * `finished` turns true when the final text is ready. `heardSpeech` turns true as soon as
 * any words have been recognised. `confidence` is the mean confidence (0 to 1), or null.
 */
export function useLiveTranscription() {
  const [status, setStatus] = useState("Idle");
  const [finalText, setFinalText] = useState("");
  const [partialText, setPartialText] = useState("");
  const [confidence, setConfidence] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [finished, setFinished] = useState(false);
  const [heardSpeech, setHeardSpeech] = useState(false);

  const socketRef = useRef<WebSocket | null>(null);
  const socketOpenRef = useRef(false);
  const connectingRef = useRef(false);
  const queueRef = useRef<ArrayBuffer[]>([]);
  const queuedBytesRef = useRef(0);
  const finalRef = useRef("");
  const confSumRef = useRef(0);
  const confCountRef = useRef(0);
  const stoppedRef = useRef(false);
  const speechRef = useRef(false);
  const permissionRef = useRef(false);
  const preparedKeyRef = useRef<{ apiKey: string; at: number } | null>(null);
  const noSpeechTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const maxTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finishAfterEndpointRef = useRef<() => void>(() => undefined);

  const { isStreaming, stream } = useAudioStream({
    channels: 1,
    encoding: "int16",
    sampleRate: 16000,
    onBuffer: (buffer) => {
      const socket = socketRef.current;
      if (socketOpenRef.current && socket && socket.readyState === WebSocket.OPEN) {
        socket.send(buffer.data);
        return;
      }
      if (connectingRef.current && queuedBytesRef.current < MAX_QUEUED_BYTES) {
        queueRef.current.push(buffer.data);
        queuedBytesRef.current += buffer.data.byteLength;
      }
    },
  });

  const clearTimers = () => {
    if (noSpeechTimerRef.current !== null) clearTimeout(noSpeechTimerRef.current);
    if (maxTimerRef.current !== null) clearTimeout(maxTimerRef.current);
    noSpeechTimerRef.current = null;
    maxTimerRef.current = null;
  };

  const stopAudio = useCallback(() => {
    try {
      stream.stop();
    } catch {
      // Already stopped.
    }
  }, [stream]);

  useEffect(() => {
    return () => {
      clearTimers();
      stopAudio();
      socketRef.current?.close();
    };
  }, [stopAudio]);

  /** Microphone permission only. The phone is switched to record mode in start(). */
  const ensurePermission = useCallback(async () => {
    if (permissionRef.current) return;
    const permission = await requestRecordingPermissionsAsync();
    if (!permission.granted) throw new Error("Microphone permission was denied.");
    permissionRef.current = true;
  }, []);

  /** Best effort: gets permission and a fresh speech key ready. start() reports real problems. */
  const prepare = useCallback(async () => {
    try {
      await ensurePermission();
      const prepared = preparedKeyRef.current;
      const fresh = prepared !== null && Date.now() - prepared.at < KEY_MAX_AGE_MS;
      if (!fresh) preparedKeyRef.current = { apiKey: await fetchSpeechKey(), at: Date.now() };
    } catch {
      // Ignored on purpose.
    }
  }, [ensurePermission]);

  const takeKey = async (): Promise<string> => {
    const prepared = preparedKeyRef.current;
    preparedKeyRef.current = null; // keys are single-use
    if (prepared && Date.now() - prepared.at < KEY_MAX_AGE_MS) return prepared.apiKey;
    return fetchSpeechKey();
  };

  const endStream = (socket: WebSocket) => {
    // An empty text frame tells Soniox the audio has ended.
    socket.send("");
    setStatus("Finishing...");
    // Safety net in case the server never sends its final message.
    setTimeout(() => socket.close(), 5000);
  };

  /** The speaker finished (Soniox sent "<end>"): everything before it is final, so we are done. */
  const finishAfterEndpoint = () => {
    stoppedRef.current = true;
    clearTimers();
    stopAudio();
    setStatus("Finished");
    setFinished(true);
    const socket = socketRef.current;
    if (socket && socket.readyState === WebSocket.OPEN) {
      try {
        socket.send("");
      } catch {
        // Closing anyway.
      }
      setTimeout(() => socket.close(), 800);
    }
  };

  // finishNow() is a stable function that always runs the latest version of finishAfterEndpoint.
  useEffect(() => {
    finishAfterEndpointRef.current = finishAfterEndpoint;
  });

  const armTimers = () => {
    clearTimers();
    noSpeechTimerRef.current = setTimeout(() => {
      if (!speechRef.current && !stoppedRef.current) stop();
    }, NO_SPEECH_MS);
    maxTimerRef.current = setTimeout(() => {
      if (!stoppedRef.current) stop();
    }, MAX_LISTEN_MS);
  };

  const handleMessage = (event: { data?: unknown }) => {
    let message: SonioxMessage;
    try {
      message = JSON.parse(String(event.data)) as SonioxMessage;
    } catch {
      return;
    }

    if (message.error_code) {
      clearTimers();
      setError(
        `${message.error_code} ${message.error_type ?? ""}: ${message.error_message ?? ""}`.trim(),
      );
      setStatus("Error");
      stopAudio();
      socketRef.current?.close();
      return;
    }

    let partial = "";
    let sawEndpoint = false;
    for (const token of message.tokens ?? []) {
      if (!token.text) continue;
      if (token.text === "<end>") {
        sawEndpoint = true;
        continue;
      }
      if (token.text === "<fin>") continue;
      if (!speechRef.current && token.text.trim() !== "") {
        speechRef.current = true;
        setHeardSpeech(true);
        if (noSpeechTimerRef.current !== null) {
          clearTimeout(noSpeechTimerRef.current);
          noSpeechTimerRef.current = null;
        }
      }
      if (token.is_final) {
        finalRef.current += token.text;
        if (typeof token.confidence === "number" && token.text.trim() !== "") {
          confSumRef.current += token.confidence;
          confCountRef.current += 1;
        }
      } else {
        partial += token.text;
      }
    }
    setFinalText(finalRef.current);
    setPartialText(partial);
    setConfidence(confCountRef.current > 0 ? confSumRef.current / confCountRef.current : null);

    if (sawEndpoint && !stoppedRef.current) {
      finishAfterEndpoint();
      return;
    }

    if (message.finished) {
      clearTimers();
      setStatus("Finished");
      setFinished(true);
      socketRef.current?.close();
    }
  };

  /** `terms` are the sounds/words the child is expected to say; Soniox uses them as hints. */
  const start = async (terms: readonly string[]) => {
    setError(null);
    setFinalText("");
    setPartialText("");
    setConfidence(null);
    setFinished(false);
    setHeardSpeech(false);
    finalRef.current = "";
    confSumRef.current = 0;
    confCountRef.current = 0;
    stoppedRef.current = false;
    speechRef.current = false;
    queueRef.current = [];
    queuedBytesRef.current = 0;
    connectingRef.current = true;
    clearTimers();
    setBusy(true);

    try {
      setStatus("Starting microphone...");
      await ensurePermission();

      // Fetch the key in parallel with starting the microphone.
      const keyPromise = takeKey();
      keyPromise.catch(() => undefined); // surfaced below; avoids an "unhandled rejection" warning

      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await stream.start();
      if (stream.sampleRate !== 16000 || stream.channels !== 1) {
        throw new Error(`Mic delivered ${stream.sampleRate} Hz, ${stream.channels} ch; expected 16000 Hz mono.`);
      }
      setStatus("Listening...");
      armTimers();

      const apiKey = await keyPromise;
      await new Promise<void>((resolve, reject) => {
        const socket = new WebSocket(STT_URL, ["soniox-api-key", apiKey]);
        socketRef.current = socket;
        socket.onopen = () => {
          socket.send(
            JSON.stringify({
              model: STT_MODEL,
              audio_format: "pcm_s16le",
              sample_rate: 16000,
              num_channels: 1,
              language_hints: ["tl"],
              context: { terms },
              enable_endpoint_detection: true,
              endpoint_latency_adjustment_level: ENDPOINT_LATENCY_LEVEL,
              endpoint_sensitivity: ENDPOINT_SENSITIVITY,
              max_endpoint_delay_ms: MAX_ENDPOINT_DELAY_MS,
            }),
          );
          // Send everything captured while connecting, in order, then go live.
          for (const chunk of queueRef.current) socket.send(chunk);
          queueRef.current = [];
          queuedBytesRef.current = 0;
          socketOpenRef.current = true;
          connectingRef.current = false;
          // The child (or a timer) may have stopped before the connection finished opening.
          if (stoppedRef.current) endStream(socket);
          resolve();
        };
        socket.onmessage = handleMessage;
        socket.onerror = () => reject(new Error("WebSocket connection error."));
        socket.onclose = () => {
          socketOpenRef.current = false;
          if (stoppedRef.current) setFinished(true);
          setStatus((current) => (current === "Error" || current === "Finished" ? current : "Closed"));
        };
      });
    } catch (caught) {
      connectingRef.current = false;
      clearTimers();
      setError(caught instanceof Error ? caught.message : String(caught));
      setStatus("Idle");
      stopAudio();
      socketRef.current?.close();
    } finally {
      setBusy(false);
    }
  };

  /** Manual stop (the small "Ihinto" button) and the timers' way to give up. */
  const stop = () => {
    stoppedRef.current = true;
    clearTimers();
    stopAudio();
    const socket = socketRef.current;
    if (socket && socketOpenRef.current && socket.readyState === WebSocket.OPEN) {
      endStream(socket);
    } else {
      // Still connecting: the open handler will finish the stream.
      setStatus("Finishing...");
    }
  };

  /** Ends the turn right now with whatever has been heard so far (used when the words already match). */
  const finishNow = useCallback(() => {
    if (stoppedRef.current) return;
    finishAfterEndpointRef.current();
  }, []);

  return {
    status,
    finalText,
    partialText,
    confidence,
    error,
    busy,
    finished,
    heardSpeech,
    isListening: isStreaming,
    prepare,
    start,
    stop,
    finishNow,
  };
}
