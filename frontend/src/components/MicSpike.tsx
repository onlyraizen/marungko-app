import {
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioStream,
} from "expo-audio";
import { useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

/**
 * Phase 1 spike: does live PCM capture work on this device (Expo Go on iPhone,
 * Android build)? No network, no login. Replaced by the real lesson screens later.
 */
export default function MicSpikeScreen() {
  const [permission, setPermission] = useState("not asked yet");
  const [format, setFormat] = useState("-");
  const [buffers, setBuffers] = useState(0);
  const [peak, setPeak] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const counters = useRef({ buffers: 0, peak: 0 });

  const { isStreaming, stream } = useAudioStream({
    channels: 1,
    encoding: "int16",
    sampleRate: 16000,
    onBuffer: (buffer) => {
      const samples = new Int16Array(buffer.data);
      let max = 0;
      for (let i = 0; i < samples.length; i += 1) {
        const value = Math.abs(samples[i] ?? 0);
        if (value > max) max = value;
      }
      counters.current.buffers += 1;
      counters.current.peak = Math.max(counters.current.peak, max);
      // Update the screen every 5th buffer so rendering doesn't slow capture.
      if (counters.current.buffers % 5 === 0) {
        setBuffers(counters.current.buffers);
        setPeak(counters.current.peak);
      }
    },
  });

  const start = async () => {
    setError(null);
    try {
      const result = await requestRecordingPermissionsAsync();
      setPermission(result.granted ? "granted" : "denied");
      if (!result.granted) return;

      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      counters.current = { buffers: 0, peak: 0 };
      setBuffers(0);
      setPeak(0);
      await stream.start();
      setFormat(`${stream.sampleRate} Hz, ${stream.channels} channel(s)`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    }
  };

  const stop = () => {
    try {
      stream.stop();
      setBuffers(counters.current.buffers);
      setPeak(counters.current.peak);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Mic spike</Text>
      <Text style={styles.line}>Permission: {permission}</Text>
      <Text style={styles.line}>Streaming: {isStreaming ? "yes" : "no"}</Text>
      <Text style={styles.line}>Format: {format}</Text>
      <Text style={styles.line}>Buffers received: {buffers}</Text>
      <View style={styles.meterTrack}>
        <View style={[styles.meterFill, { width: `${Math.min(100, (peak / 32768) * 100)}%` }]} />
      </View>
      <Text style={styles.line}>Loudest so far: {peak} / 32768</Text>
      {error ? <Text style={styles.error}>Error: {error}</Text> : null}

      <Pressable
        style={[styles.button, isStreaming && styles.buttonStop]}
        onPress={isStreaming ? stop : start}
      >
        <Text style={styles.buttonText}>{isStreaming ? "Stop" : "Start listening"}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, paddingTop: 48, gap: 12 },
  title: { fontSize: 28, fontWeight: "700" },
  line: { fontSize: 18 },
  error: { fontSize: 16, color: "#b00020" },
  meterTrack: { height: 16, backgroundColor: "#ddd", borderRadius: 8, overflow: "hidden" },
  meterFill: { height: 16, backgroundColor: "#2e9e4f" },
  button: {
    marginTop: 16,
    backgroundColor: "#1f6feb",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  buttonStop: { backgroundColor: "#c62828" },
  buttonText: { color: "#fff", fontSize: 18, fontWeight: "600" },
});
