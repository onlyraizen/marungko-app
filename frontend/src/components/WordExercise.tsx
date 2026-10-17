import { FACTS, audioKey, matchUtterance, type MatchResult } from "@marungko/shared";
import { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useGuideAudio } from "../hooks/useGuideAudio";
import { useLiveTranscription } from "../hooks/useLiveTranscription";
import type { CompleteResult } from "../services/progress";

type Props = {
  title: string;
  /** What the child reads aloud, in teaching order. */
  items: readonly string[];
  onDone: () => void;
  /** Called after every marked answer. Saved in the background. */
  onAttempt?: (item: string, heard: string, kind: MatchResult["kind"]) => void;
  /** Called once when the lesson is finished; returns the XP and streak to show. */
  onComplete?: (correct: number, total: number) => Promise<CompleteResult>;
};

const FEEDBACK: Record<MatchResult["kind"], { title: string; color: string; voice: string }> = {
  correct: { title: "Tama!", color: "#2e9e4f", voice: "Tama!" },
  almost: { title: "Halos na!", color: "#c77700", voice: "Halos na!" },
  incorrect: { title: "Subukan ulit", color: "#c62828", voice: "Subukan ulit." },
};

/** Hear the word, tap once and read it aloud, get marked, learn a fact, move on. */
export default function WordExercise({ title, items, onDone, onAttempt, onComplete }: Props) {
  const {
    status,
    finalText,
    partialText,
    confidence,
    error,
    busy,
    finished,
    heardSpeech,
    isListening,
    prepare,
    start,
    stop,
  } = useLiveTranscription();
  const guide = useGuideAudio();
  const [index, setIndex] = useState(0);
  const [result, setResult] = useState<MatchResult | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [saving, setSaving] = useState(false);
  const [summary, setSummary] = useState<CompleteResult | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const awaitingResult = useRef(false);
  const reported = useRef(false);
  const correctItems = useRef(new Set<string>());

  const target = items[index];
  const complete = index >= items.length;
  const fact = result?.kind === "correct" && target !== undefined ? FACTS[audioKey(target)] : undefined;

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
      const heardText = `${finalText}${partialText}`;
      const next = matchUtterance(heardText, target);
      setResult(next);
      if (next.kind === "correct") {
        correctItems.current.add(target);
        setCorrectCount(correctItems.current.size);
      }
      onAttempt?.(target, next.heard, next.kind);
    }
  }, [finished, finalText, partialText, target, onAttempt]);

  // Spoken feedback after each answer.
  useEffect(() => {
    if (result) guide.say(FEEDBACK[result.kind].voice);
  }, [result, guide.say]);

  // Lesson finished: speak, and save the result once.
  useEffect(() => {
    if (!complete || reported.current) return;
    reported.current = true;
    guide.say("Magaling, tapos na ang aralin!");
    if (!onComplete) return;
    setSaving(true);
    onComplete(correctItems.current.size, items.length)
      .then(setSummary)
      .catch((caught: unknown) => setSaveError(caught instanceof Error ? caught.message : String(caught)))
      .finally(() => setSaving(false));
  }, [complete, guide.say, onComplete, items.length]);

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
        {saving ? <Text style={styles.status}>Sine-save ang progreso...</Text> : null}
        {summary ? (
          <>
            <Text style={styles.gain}>+{summary.gained} XP</Text>
            <Text style={styles.heard}>
              Kabuuan: {summary.xp} XP · {summary.streak} araw na magkakasunod
            </Text>
          </>
        ) : null}
        {saveError ? <Text style={styles.error}>Hindi na-save ang progreso: {saveError}</Text> : null}
        <Pressable style={styles.button} onPress={onDone}>
          <Text style={styles.buttonText}>Bumalik</Text>
        </Pressable>
      </ScrollView>
    );
  }

  const feedback = result ? FEEDBACK[result.kind] : null;
  const micLocked = guide.speaking || busy;

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

      {isListening ? (
        <View style={styles.listening}>
          <Text style={styles.listeningTitle}>{heardSpeech ? "Narinig kita..." : "Nakikinig..."}</Text>
          <Text style={styles.listeningHint}>Sabihin ang salita. Awtomatiko itong titigil.</Text>
        </View>
      ) : feedback && result ? (
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

      {fact && !isListening ? (
        <View style={styles.factCard}>
          <Text style={styles.factTitle}>Alam mo ba?</Text>
          <Text style={styles.factText}>{fact}</Text>
        </View>
      ) : null}

      {error ? <Text style={styles.error}>Error: {error}</Text> : null}

      {isListening ? (
        <Pressable style={styles.outline} onPress={stop}>
          <Text style={styles.outlineText}>Ihinto</Text>
        </Pressable>
      ) : result?.kind === "correct" ? null : (
        <Pressable
          style={[styles.button, micLocked && styles.disabled]}
          disabled={micLocked}
          onPress={onStart}
        >
          <Text style={styles.buttonText}>{result ? "Subukan ulit" : "Magsalita"}</Text>
        </Pressable>
      )}

      {result && !isListening ? (
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
  gain: { fontSize: 40, fontWeight: "700", color: "#2e9e4f" },
  heard: { fontSize: 18, color: "#333" },
  confidence: { fontSize: 14, color: "#888" },
  status: { fontSize: 16, color: "#666" },
  error: { fontSize: 16, color: "#b00020", textAlign: "center" },
  listening: { alignItems: "center", gap: 4, paddingVertical: 8 },
  listeningTitle: { fontSize: 28, fontWeight: "700", color: "#1f6feb" },
  listeningHint: { fontSize: 15, color: "#666", textAlign: "center" },
  factCard: {
    alignSelf: "stretch",
    backgroundColor: "#FFF6D6",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#F0D27A",
    padding: 14,
    gap: 4,
  },
  factTitle: { fontSize: 16, fontWeight: "800", color: "#8A6100" },
  factText: { fontSize: 18, color: "#3B2F00", lineHeight: 25 },
  button: {
    marginTop: 12,
    alignSelf: "stretch",
    backgroundColor: "#1f6feb",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
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
