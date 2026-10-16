import { matchUtterance, type MatchResult } from "@marungko/shared";
import { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text } from "react-native";
import { useGuideAudio } from "../hooks/useGuideAudio";
import { useLiveTranscription } from "../hooks/useLiveTranscription";

type Props = {
  title: string;
  /** What the child reads aloud, in teaching order. */
  items: readonly string[];
  onDone: () => void;
};

const FEEDBACK: Record<MatchResult["kind"], { title: string; color: string; voice: string }> = {
  correct: { title: "Tama!", color: "#2e9e4f", voice: "Tama!" },
  almost: { title: "Halos na!", color: "#c77700", voice: "Halos na!" },
  incorrect: { title: "Subukan ulit", color: "#c62828", voice: "Subukan ulit." },
};

/** Hear the word, read it aloud, get marked, move on. One unit per run. */
export default function WordExercise({ title, items, onDone }: Props) {
  const { status, finalText, partialText, confidence, error, busy, finished, isListening, prepare, start, stop } =
    useLiveTranscription();
  const guide = useGuideAudio();
  const [index, setIndex] = useState(0);
  const [result, setResult] = useState<MatchResult | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const awaitingResult = useRef(false);
  const correctItems = useRef(new Set<string>());

  const target = items[index];
  const complete = index >= items.length;

  // Get the microphone and a speech key ready while the child looks at the word,
  // so tapping "Magsalita" starts listening at once. Does nothing if a fresh key is ready.
  useEffect(() => {
    if (!isListening && !complete) void prepare();
  }, [index, result, isListening, complete, prepare]);

  // The guide says each new word. The microphone stays closed while it speaks.
  useEffect(() => {
    if (complete || target === undefined) return;
    const timer = setTimeout(() => guide.say(target), 400);
    return () => clearTimeout(timer);
  }, [index, complete, target, guide.say]);

  useEffect(() => {
    if (finished && awaitingResult.current && target !== undefined) {
      awaitingResult.current = false;
      const next = matchUtterance(`${finalText}${partialText}`, target);
      setResult(next);
      if (next.kind === "correct") {
        correctItems.current.add(target);
        setCorrectCount(correctItems.current.size);
      }
    }
  }, [finished, finalText, partialText, target]);

  // Spoken feedback after each answer.
  useEffect(() => {
    if (result) guide.say(FEEDBACK[result.kind].voice);
  }, [result, guide.say]);

  useEffect(() => {
    if (complete) guide.say("Magaling, tapos na ang aralin!");
  }, [complete, guide.say]);

  const onStart = () => {
    guide.stop();
    setResult(null);
    awaitingResult.current = true;
    void start(items);
  };

  const onNext = () => {
    guide.stop();
    setResult(null);
    setIndex((current) => current + 1);
  };

  if (complete) {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.label}>{title}</Text>
        <Text style={styles.done}>Tapos na ang aralin!</Text>
        <Text style={styles.heard}>
          Tama: {correctCount} / {items.length}
        </Text>
        <Pressable style={styles.button} onPress={onDone}>
          <Text style={styles.buttonText}>Bumalik</Text>
        </Pressable>
      </ScrollView>
    );
  }

  const feedback = result ? FEEDBACK[result.kind] : null;
  const micLocked = guide.speaking || (busy && !isListening);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.label}>
        {title} · {index + 1} / {items.length}
      </Text>
      <Text style={styles.prompt}>Basahin:</Text>
      <Text style={styles.target}>{target}</Text>

      {target !== undefined && guide.has(target) && !isListening ? (
        <Pressable
          style={[styles.outline, guide.speaking && styles.disabled]}
          disabled={guide.speaking}
          onPress={() => guide.say(target)}
        >
          <Text style={styles.outlineText}>{guide.speaking ? "Nagsasalita..." : "Pakinggan"}</Text>
        </Pressable>
      ) : null}

      {feedback && result ? (
        <>
          <Text style={[styles.feedback, { color: feedback.color }]}>{feedback.title}</Text>
          <Text style={styles.heard}>
            {result.heard === "" ? "Walang narinig." : `Narinig: ${result.heard}`}
          </Text>
          {/* Dev measurement: how sure the engine was. Not used for marking. */}
          <Text style={styles.confidence}>
            Linaw: {confidence === null ? "-" : `${Math.round(confidence * 100)}%`}
          </Text>
        </>
      ) : (
        <Text style={styles.status}>{guide.speaking ? "Makinig..." : status}</Text>
      )}

      {error ? <Text style={styles.error}>Error: {error}</Text> : null}

      {result?.kind === "correct" ? null : (
        <Pressable
          style={[styles.button, isListening && styles.buttonStop, micLocked && styles.disabled]}
          disabled={micLocked}
          onPress={isListening ? stop : onStart}
        >
          <Text style={styles.buttonText}>
            {isListening ? "Tapos na" : result ? "Subukan ulit" : "Magsalita"}
          </Text>
        </Pressable>
      )}

      {result ? (
        <Pressable style={result.kind === "correct" ? styles.button : styles.outline} onPress={onNext}>
          <Text style={result.kind === "correct" ? styles.buttonText : styles.outlineText}>
            {index + 1 >= items.length ? "Tapusin" : "Susunod"}
          </Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, paddingTop: 32, gap: 14, alignItems: "center" },
  label: { fontSize: 16, color: "#555" },
  prompt: { fontSize: 18, color: "#555" },
  target: { fontSize: 64, fontWeight: "700", textAlign: "center" },
  feedback: { fontSize: 36, fontWeight: "700" },
  done: { fontSize: 32, fontWeight: "700", textAlign: "center", marginTop: 24 },
  heard: { fontSize: 18, color: "#333" },
  confidence: { fontSize: 14, color: "#888" },
  status: { fontSize: 16, color: "#666" },
  error: { fontSize: 16, color: "#b00020", textAlign: "center" },
  button: {
    marginTop: 12,
    alignSelf: "stretch",
    backgroundColor: "#1f6feb",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  buttonStop: { backgroundColor: "#c62828" },
  disabled: { opacity: 0.4 },
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
