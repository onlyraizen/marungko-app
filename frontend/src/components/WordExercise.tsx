import { matchUtterance, type MatchResult } from "@marungko/shared";
import { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text } from "react-native";
import { useLiveTranscription } from "../hooks/useLiveTranscription";

type WordItem = { text: string; accept: readonly string[] };

// Placeholder lesson. The real items come from the Marungko content files.
const ITEMS: readonly WordItem[] = [
  { text: "ma", accept: [] },
  { text: "sa", accept: [] },
  { text: "mi", accept: [] },
  { text: "si", accept: [] },
  { text: "mama", accept: [] },
  { text: "sama", accept: [] },
  { text: "masa", accept: [] },
  { text: "misa", accept: [] },
];
const TERMS = ITEMS.map((item) => item.text);

const FEEDBACK: Record<MatchResult["kind"], { title: string; color: string }> = {
  correct: { title: "Tama!", color: "#2e9e4f" },
  almost: { title: "Halos na!", color: "#c77700" },
  incorrect: { title: "Subukan ulit", color: "#c62828" },
};

/** Show a target, listen, mark it. First real piece of the lesson loop. */
export default function WordExercise() {
  const { status, finalText, partialText, error, busy, finished, isListening, start, stop } =
    useLiveTranscription();
  const [index, setIndex] = useState(0);
  const [result, setResult] = useState<MatchResult | null>(null);
  const awaitingResult = useRef(false);

  const target = ITEMS[index] ?? ITEMS[0];

  useEffect(() => {
    if (finished && awaitingResult.current && target) {
      awaitingResult.current = false;
      setResult(matchUtterance(`${finalText}${partialText}`, target.text, target.accept));
    }
  }, [finished, finalText, partialText, target]);

  const onStart = () => {
    setResult(null);
    awaitingResult.current = true;
    void start(TERMS);
  };

  const onNext = () => {
    setResult(null);
    setIndex((current) => (current + 1) % ITEMS.length);
  };

  const feedback = result ? FEEDBACK[result.kind] : null;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.label}>Basahin:</Text>
      <Text style={styles.target}>{target?.text}</Text>

      {feedback && result ? (
        <>
          <Text style={[styles.feedback, { color: feedback.color }]}>{feedback.title}</Text>
          <Text style={styles.heard}>
            {result.heard === "" ? "Walang narinig." : `Narinig: ${result.heard}`}
          </Text>
        </>
      ) : (
        <Text style={styles.status}>{status}</Text>
      )}

      {error ? <Text style={styles.error}>Error: {error}</Text> : null}

      <Pressable
        style={[styles.button, isListening && styles.buttonStop, busy && !isListening && styles.disabled]}
        disabled={busy && !isListening}
        onPress={isListening ? stop : onStart}
      >
        <Text style={styles.buttonText}>
          {isListening ? "Tapos na" : result ? "Subukan ulit" : "Magsalita"}
        </Text>
      </Pressable>

      {result ? (
        <Pressable style={styles.outline} onPress={onNext}>
          <Text style={styles.outlineText}>Susunod</Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, paddingTop: 48, gap: 14, alignItems: "center" },
  label: { fontSize: 18, color: "#555" },
  target: { fontSize: 72, fontWeight: "700" },
  feedback: { fontSize: 36, fontWeight: "700" },
  heard: { fontSize: 18, color: "#333" },
  status: { fontSize: 16, color: "#666" },
  error: { fontSize: 16, color: "#b00020", textAlign: "center" },
  button: {
    marginTop: 16,
    alignSelf: "stretch",
    backgroundColor: "#1f6feb",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  buttonStop: { backgroundColor: "#c62828" },
  disabled: { opacity: 0.5 },
  buttonText: { color: "#fff", fontSize: 18, fontWeight: "600" },
  outline: {
    alignSelf: "stretch",
    borderWidth: 1,
    borderColor: "#999",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  outlineText: { fontSize: 16 },
});
