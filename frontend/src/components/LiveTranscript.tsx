import { Pressable, ScrollView, StyleSheet, Text } from "react-native";
import { useLiveTranscription } from "../hooks/useLiveTranscription";

// Placeholder words for the spike. The real list comes from the Marungko lessons.
const TERMS = ["ma", "sa", "mi", "si", "mama", "sama", "masa", "misa", "mais", "ama", "ina", "asa"];

export default function LiveTranscript() {
  const { status, finalText, partialText, error, busy, isListening, start, stop } =
    useLiveTranscription();

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
        style={[styles.button, isListening && styles.buttonStop, busy && !isListening && styles.disabled]}
        disabled={busy && !isListening}
        onPress={isListening ? stop : () => void start(TERMS)}
      >
        <Text style={styles.buttonText}>{isListening ? "Stop" : "Start"}</Text>
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
