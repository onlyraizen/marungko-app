import { FACTS, audioKey, matchUtterance, type MatchResult } from "@marungko/shared";
import { useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useGuideAudio } from "../../hooks/useGuideAudio";
import { useLiveTranscription } from "../../hooks/useLiveTranscription";
import type { CompleteResult } from "../../services/progress";
import { useAppStore } from "../../store/useAppStore";
import { colors } from "../../theme/colors";
import { font } from "../../theme/fonts";
import type { Pose } from "../art/assets";
import MicButton from "../ui/MicButton";
import ExampleCard from "./ExampleCard";
import FeedbackSheet from "./FeedbackSheet";
import LessonHeader from "./LessonHeader";
import LessonResult from "./LessonResult";
import { FEEDBACK, PRAISE } from "./lessonText";
import PictureQuiz from "./PictureQuiz";
import { buildQuiz, exampleFor, pictureOf } from "./pictures";
import Stage from "./Stage";
import { SpeakerButton } from "./SpeakerButton";

type Props = {
  title: string;
  /** What the child reads aloud, in teaching order. */
  items: readonly string[];
  /** The lesson's words, for the picture quiz at the end. */
  quizWords: readonly string[];
  onDone: () => void;
  /** Called after every marked answer. Saved in the background. */
  onAttempt?: (item: string, heard: string, kind: MatchResult["kind"]) => void;
  /** Called once when the reading part is finished; returns the XP and streak to show. */
  onComplete?: (correct: number, total: number) => Promise<CompleteResult>;
};

type Phase = "practice" | "quiz" | "result";

const POSE: Record<MatchResult["kind"], Pose> = { correct: "cheer", almost: "almost", incorrect: "thinking" };

/**
 * One lesson, in the Duolingo style: Capi talks and says the word, shows a picture,
 * listens (hands-free), reacts, and tells a fun fact. Then a picture quiz and the results.
 */
export default function LessonScreen({ title, items, quizWords, onDone, onAttempt, onComplete }: Props) {
  const { finalText, partialText, error, busy, finished, heardSpeech, isListening, prepare, start, stop, confidence } =
    useLiveTranscription();
  const slow = useAppStore((state) => state.slowGuide);
  const setSlow = useAppStore((state) => state.setSlowGuide);
  const guide = useGuideAudio(slow);
  const quiz = useMemo(() => buildQuiz(quizWords), [quizWords]);

  const [phase, setPhase] = useState<Phase>("practice");
  const [index, setIndex] = useState(0);
  const [result, setResult] = useState<MatchResult | null>(null);
  const [praise, setPraise] = useState<string>(PRAISE[0]);
  const [correctCount, setCorrectCount] = useState(0);
  const [saving, setSaving] = useState(false);
  const [summary, setSummary] = useState<CompleteResult | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [quizScore, setQuizScore] = useState<{ correct: number; total: number } | null>(null);
  const awaitingResult = useRef(false);
  const reported = useRef(false);
  const correctItems = useRef(new Set<string>());

  const target = items[index];
  const complete = index >= items.length;
  const example = target !== undefined ? exampleFor(target) : null;
  const picture = example ?? (target !== undefined ? pictureOf(target) : null);
  const fact = result?.kind === "correct" && target !== undefined ? FACTS[audioKey(target)] : undefined;

  // Get the microphone and a speech key ready while the child looks at the word,
  // so tapping the mic starts listening at once. Does nothing if a fresh key is ready.
  useEffect(() => {
    if (phase === "practice" && !isListening && !complete) void prepare();
  }, [phase, index, result, isListening, complete, prepare]);

  // Capi says each new word (and its example word). The microphone stays closed while he speaks.
  useEffect(() => {
    if (phase !== "practice" || complete || target === undefined) return;
    const lines = example ? [target, example.word] : [target];
    const timer = setTimeout(() => guide.sayAll(lines), 450);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, index, complete, target, guide.sayAll]);

  useEffect(() => {
    if (finished && awaitingResult.current && target !== undefined) {
      awaitingResult.current = false;
      const heardText = `${finalText}${partialText}`;
      const next = matchUtterance(heardText, target);
      setResult(next);
      if (next.kind === "correct") {
        correctItems.current.add(target);
        setCorrectCount(correctItems.current.size);
        setPraise(PRAISE[(correctItems.current.size - 1) % PRAISE.length] ?? PRAISE[0]);
      }
      onAttempt?.(target, next.heard, next.kind);
    }
  }, [finished, finalText, partialText, target, onAttempt]);

  // Spoken feedback after each answer.
  useEffect(() => {
    if (result) guide.say(result.kind === "correct" ? praise : FEEDBACK[result.kind].voice);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result, guide.say]);

  // Reading part finished: save the result once, then the picture quiz.
  useEffect(() => {
    if (!complete || reported.current) return;
    reported.current = true;
    setPhase(quiz.length > 0 ? "quiz" : "result");
    if (!onComplete) return;
    setSaving(true);
    onComplete(correctItems.current.size, items.length)
      .then(setSummary)
      .catch((caught: unknown) => setSaveError(caught instanceof Error ? caught.message : String(caught)))
      .finally(() => setSaving(false));
  }, [complete, onComplete, items.length, quiz.length]);

  const onMic = () => {
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

  const toggleSlow = () => setSlow(!slow);
  const close = () => {
    guide.stop();
    stop();
    onDone();
  };

  if (phase === "quiz") {
    return (
      <PictureQuiz
        questions={quiz}
        guide={guide}
        slow={slow}
        onToggleSlow={toggleSlow}
        onClose={close}
        onFinish={(correct, total) => {
          setQuizScore({ correct, total });
          setPhase("result");
        }}
      />
    );
  }

  if (phase === "result") {
    return (
      <LessonResult
        title={title}
        correct={correctCount}
        total={items.length}
        quizScore={quizScore}
        summary={summary}
        saving={saving}
        saveError={saveError}
        guide={guide}
        onDone={onDone}
      />
    );
  }

  if (complete || target === undefined) return <View style={styles.root} />;

  const pose: Pose = result ? POSE[result.kind] : "rest";
  const big = target.length > 6 ? 44 : target.length > 4 ? 56 : 72;
  const sheetUp = result !== null && !isListening;
  const heardLine = result ? (result.heard === "" ? "Walang narinig." : `Narinig: ${result.heard}`) : undefined;

  return (
    <View style={styles.root}>
      <LessonHeader progress={index / items.length} slow={slow} onToggleSlow={toggleSlow} onClose={close} />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.count}>
          {title} · {index + 1} / {items.length}
        </Text>
        <Stage talking={guide.speaking} listening={isListening} pose={pose}>
          <Text style={styles.kicker}>{isListening ? (heardSpeech ? "Narinig kita..." : "Nakikinig ako...") : "Basahin mo:"}</Text>
          <Text style={[styles.target, { fontSize: big, lineHeight: big * 1.1 }]} numberOfLines={1} adjustsFontSizeToFit>
            {target.toUpperCase()}
          </Text>
          {guide.has(target) && !isListening ? (
            <SpeakerButton speaking={guide.speaking} onPress={() => guide.sayAll(example ? [target, example.word] : [target])} />
          ) : null}
        </Stage>

        {picture ? <ExampleCard syllable={example ? target : null} picture={picture} /> : null}

        {error ? <Text style={styles.error}>Error: {error}</Text> : null}
      </ScrollView>

      {!sheetUp ? (
        <View style={styles.micArea}>
          <MicButton
            live={isListening}
            disabled={!isListening && (guide.speaking || busy)}
            onPress={isListening ? stop : onMic}
            label={isListening ? "Nakikinig... pindutin para huminto" : guide.speaking ? "Makinig muna..." : "Pindutin at magsalita"}
          />
        </View>
      ) : null}

      {sheetUp && result ? (
        result.kind === "correct" ? (
          <FeedbackSheet
            good
            title={praise}
            line={heardLine}
            primaryLabel={index + 1 >= items.length ? "Tapusin" : "Susunod"}
            onPrimary={onNext}
          >
            {fact ? (
              <View style={styles.fact}>
                <Text style={styles.factTitle}>💡 Alam mo ba?</Text>
                <Text style={styles.factText}>{fact}</Text>
              </View>
            ) : null}
            {__DEV__ ? <Text style={styles.dev}>Linaw: {confidence === null ? "-" : `${Math.round(confidence * 100)}%`}</Text> : null}
          </FeedbackSheet>
        ) : (
          <FeedbackSheet
            good={false}
            title={FEEDBACK[result.kind].title}
            line={heardLine}
            primaryLabel="Subukan ulit"
            onPrimary={onMic}
            secondaryLabel={index + 1 >= items.length ? "Tapusin" : "Laktawan"}
            onSecondary={onNext}
          >
            {__DEV__ ? <Text style={styles.dev}>Linaw: {confidence === null ? "-" : `${Math.round(confidence * 100)}%`}</Text> : null}
          </FeedbackSheet>
        )
      ) : null}
    </View>
  );
}


const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: { flexGrow: 1, justifyContent: "center", paddingBottom: 16, gap: 18 },
  count: { fontFamily: font.bold, fontSize: 13, letterSpacing: 1.2, color: colors.muted, textAlign: "center", textTransform: "uppercase", marginTop: 4 },
  kicker: { fontFamily: font.bold, fontSize: 13, letterSpacing: 1.4, color: colors.muted, textTransform: "uppercase" },
  target: { fontFamily: font.display, color: colors.ink },
  micArea: { alignItems: "center", paddingTop: 8, paddingBottom: 28 },
  error: { fontFamily: font.bold, fontSize: 14, color: colors.dangerDark, textAlign: "center", paddingHorizontal: 20 },
  fact: { backgroundColor: colors.white, borderRadius: 16, borderWidth: 2, borderColor: colors.border, padding: 12, gap: 2 },
  factTitle: { fontFamily: font.bold, fontSize: 14, color: "#8A6100" },
  factText: { fontFamily: font.body, fontSize: 16, lineHeight: 22, color: colors.ink },
  dev: { fontFamily: font.body, fontSize: 12, color: colors.muted },
});
