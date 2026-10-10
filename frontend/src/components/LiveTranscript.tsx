import { requestRecordingPermissionsAsync, setAudioModeAsync, useAudioStream } from "expo-audio";
import { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text } from "react-native";
import { supabase } from "../services/supabase";

const API_URL = process.env.EXPO_PUBLIC_API_URL;
const STT_URL = "wss://stt-rt.soniox.com/transcribe-websocket";
const STT_MODEL = "stt-rt-v5";

// Placeholder words for the spike. The real list comes from the Marungko lessons.
const TERMS = ["ma", "sa", "mi", "si", "mama", "sama", "masa", "misa", "mais", "ama", "ina", "asa"];

type Token = { text?: string; is_final?: boolean };
type SonioxMessage = {
  tokens?: Token[];
  finished?: boolean;
  error_code?: number;
  error_type?: string;
  error_message?: string;
};

function readApiKey(body: unknown): string | null {
  if (typeof body === "object" && body !== null && "apiKey" in body) {
    const value = (body as { apiKey: unknown }).apiKey;
    if (typeof value === "string" && value.length > 0) return value;
  }
  return null;
}

/**
 * Phase 1 spike: live microphone -> Soniox WebSocket -> text on screen.
 * The speech key comes from our backend; the long-lived Soniox key never reaches the phone.
 */
export default function LiveTranscript() {
  const [status, setStatus] = useState("Idle");
  const [finalText, setFinalText] = useState("");
  const [partialText, setPartialText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const socketRef = useRef<WebSocket | null>(null);
  const socketOpenRef = useRef(false);
  const finalRef = useRef("");

  const { isStreaming, stream } = useAudioStream({
    channels: 1,
    encoding: "int16",
    sampleRate: 16000,
    onBuffer: (buffer) => {
      const socket = socketRef.current;
      if (socket && socketOpenRef.current && socket.readyState === WebSocket.OPEN) {
        socket.send(buffer.data);
      }
    },
  });

  const stopAudio = () => {
    try {
      stream.stop();
    } catch {
      // Already stopped.
    }
  };

  useEffect(() => {
    return () => {
      try {
        stream.stop();
      } catch {
        // Already stopped.
      }
      socketRef.current?.close();
    };
  }, [stream]);

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
      } else {
        partial += token.text;
      }
    }
    setFinalText(finalRef.current);
    setPartialText(partial);

    if (message.finished) {
      setStatus("Finished");
      socketRef.current?.close();
    }
  };

  const start = async () => {
    setError(null);
    setFinalText("");
    setPartialText("");
    finalRef.current = "";
    setBusy(true);

    try {
      setStatus("Asking for microphone...");
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) throw new Error("Microphone permission was denied.");
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });

      setStatus("Getting a speech key...");
      const { data } = await supabase.auth.getSession();
      const accessToken = data.session?.access_token;
      if (!API_URL || !accessToken) throw new Error("Not signed in, or EXPO_PUBLIC_API_URL is missing.");

      const response = await fetch(`${API_URL}/api/v1/speech/session`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ terms: TERMS }),
      });
      if (!response.ok) throw new Error(`Backend refused the speech key (HTTP ${response.status}).`);
      const apiKey = readApiKey(await response.json());
      if (!apiKey) throw new Error("Backend reply had no speech key.");

      setStatus("Connecting to Soniox...");
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
              context: { terms: TERMS },
            }),
          );
          socketOpenRef.current = true;
          resolve();
        };
        socket.onmessage = handleMessage;
        socket.onerror = () => reject(new Error("WebSocket connection error."));
        socket.onclose = () => {
          socketOpenRef.current = false;
          setStatus((current) => (current === "Error" || current === "Finished" ? current : "Closed"));
        };
      });

      await stream.start();
      if (stream.sampleRate !== 16000 || stream.channels !== 1) {
        throw new Error(`Mic delivered ${stream.sampleRate} Hz, ${stream.channels} ch; expected 16000 Hz mono.`);
      }
      setStatus("Listening... say a syllable or word");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
      setStatus("Idle");
      stopAudio();
      socketRef.current?.close();
    } finally {
      setBusy(false);
    }
  };

  const stop = () => {
    stopAudio();
    const socket = socketRef.current;
    if (socket && socket.readyState === WebSocket.OPEN) {
      // An empty text frame tells Soniox the audio has ended.
      socket.send("");
      setStatus("Finishing...");
      // Safety net in case the server never sends its final message.
      setTimeout(() => socket.close(), 5000);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Live transcript</Text>
      <Text style={styles.line}>Status: {status}</Text>

      <Text style={styles.label}>Heard:</Text>
      <Text style={styles.transcript}>
        {finalText}
        <Text style={styles.partial}>{partialText}</Text>
        {finalText === "" && partialText === "" ? "..." : ""}
      </Text>

      {error ? <Text style={styles.error}>Error: {error}</Text> : null}

      <Pressable
        style={[styles.button, isStreaming && styles.buttonStop, busy && !isStreaming && styles.disabled]}
        disabled={busy && !isStreaming}
        onPress={isStreaming ? stop : start}
      >
        <Text style={styles.buttonText}>{isStreaming ? "Stop" : "Start"}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, paddingTop: 48, gap: 12 },
  title: { fontSize: 28, fontWeight: "700" },
  line: { fontSize: 18 },
  label: { fontSize: 16, color: "#555", marginTop: 8 },
  transcript: { fontSize: 32, fontWeight: "600" },
  partial: { color: "#888" },
  error: { fontSize: 16, color: "#b00020" },
  button: {
    marginTop: 16,
    backgroundColor: "#1f6feb",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  buttonStop: { backgroundColor: "#c62828" },
  disabled: { opacity: 0.5 },
  buttonText: { color: "#fff", fontSize: 18, fontWeight: "600" },
});
