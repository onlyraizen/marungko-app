import { requestRecordingPermissionsAsync, setAudioModeAsync, useAudioStream } from "expo-audio";
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../services/supabase";

const API_URL = process.env.EXPO_PUBLIC_API_URL;
const STT_URL = "wss://stt-rt.soniox.com/transcribe-websocket";
const STT_MODEL = "stt-rt-v5";

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
 * Live microphone -> Soniox WebSocket -> text.
 *
 * Call prepare() while the child is looking at the word: it asks for microphone
 * permission once and fetches the speech key ahead of time. start() then switches the
 * phone to record mode, opens the microphone immediately and queues audio while the
 * connection opens, so the child can talk straight away.
 *
 * `finished` turns true once the server has sent the final text after stop().
 * `confidence` is the mean confidence (0 to 1) of the confirmed words, or null.
 */
export function useLiveTranscription() {
  const [status, setStatus] = useState("Idle");
  const [finalText, setFinalText] = useState("");
  const [partialText, setPartialText] = useState("");
  const [confidence, setConfidence] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [finished, setFinished] = useState(false);

  const socketRef = useRef<WebSocket | null>(null);
  const socketOpenRef = useRef(false);
  const connectingRef = useRef(false);
  const queueRef = useRef<ArrayBuffer[]>([]);
  const queuedBytesRef = useRef(0);
  const finalRef = useRef("");
  const confSumRef = useRef(0);
  const confCountRef = useRef(0);
  const stoppedRef = useRef(false);
  const permissionRef = useRef(false);
  const preparedKeyRef = useRef<{ apiKey: string; at: number } | null>(null);

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

  const stopAudio = useCallback(() => {
    try {
      stream.stop();
    } catch {
      // Already stopped.
    }
  }, [stream]);

  useEffect(() => {
    return () => {
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

  const handleMessage = (event: { data?: unknown }) => {
    let message: SonioxMessage;
    try {
      message = JSON.parse(String(event.data)) as SonioxMessage;
    } catch {
      return;
    }

    if (message.error_code) {
      setError(
        `${message.error_code} ${message.error_type ?? ""}: ${message.error_message ?? ""}`.trim(),
      );
      setStatus("Error");
      stopAudio();
      socketRef.current?.close();
      return;
    }

    let partial = "";
    for (const token of message.tokens ?? []) {
      if (!token.text) continue;
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

    if (message.finished) {
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
    finalRef.current = "";
    confSumRef.current = 0;
    confCountRef.current = 0;
    stoppedRef.current = false;
    queueRef.current = [];
    queuedBytesRef.current = 0;
    connectingRef.current = true;
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
            }),
          );
          // Send everything captured while connecting, in order, then go live.
          for (const chunk of queueRef.current) socket.send(chunk);
          queueRef.current = [];
          queuedBytesRef.current = 0;
          socketOpenRef.current = true;
          connectingRef.current = false;
          // The child may have tapped "done" before the connection finished opening.
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
      setError(caught instanceof Error ? caught.message : String(caught));
      setStatus("Idle");
      stopAudio();
      socketRef.current?.close();
    } finally {
      setBusy(false);
    }
  };

  const stop = () => {
    stoppedRef.current = true;
    stopAudio();
    const socket = socketRef.current;
    if (socket && socketOpenRef.current && socket.readyState === WebSocket.OPEN) {
      endStream(socket);
    } else {
      // Still connecting: the open handler will finish the stream.
      setStatus("Finishing...");
    }
  };

  return {
    status,
    finalText,
    partialText,
    confidence,
    error,
    busy,
    finished,
    isListening: isStreaming,
    prepare,
    start,
    stop,
  };
}
