import { FACTS, audioKey, matchUtterance, type MatchResult } from "@marungko/shared";
import { useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { buildTapQuiz } from "../../content/quiz";
import { syllabify } from "../../content/syllables";
import { useGuideAudio } from "../../hooks/useGuideAudio";
import { useLiveTranscription } from "../../hooks/useLiveTranscription";
import type { CompleteResult } from "../../services/progress";
import { useAppStore } from "../../store/useAppStore";
import { colors } from "../../theme/colors";
import { font } from "../../theme/fonts";
import type { Pose } from "../art/assets";
import FeedbackSheet from "./FeedbackSheet";
import LessonResult from "./LessonResult";
import { FEEDBACK, PRAISE } from "./lessonText";
import { exampleFor, pictureOf } from "./pictures";
import RepeatView from "./RepeatView";
import TapQuiz from "./TapQuiz";

type Props = {
  title: string;
  /** What the child reads aloud, in teaching order (syllables first, then words). */
  items: readonly string[];
  /** The lesson's words, so a syllable can be told from a word. */
  words: readonly string[];
  /** Yuzu the child had before this lesson. */
  baseYuzu: number;
  /** Review ("Balik-aral"): nothing is saved as a finished lesson. */
  review?: boolean;
  onDone: () => void;
  /** Called after every marked answer in the reading part. Saved in the background. */
  onAttempt?: (item: string, heard: string, kind: MatchResult["kind"]) => void;
  /** Called after every tap-quiz question. */
  onQuizAnswer?: (word: string, ok: boolean, heard: string, skipped: boolean) => void;
  /** A flag or thumb on an item, saved with the child's answers. */
  onNote?: (item: string, note: string) => void;
  /** Called once when the whole lesson is finished; returns the XP and streak to show. */
  onComplete?: (correct: number, total: number) => Promise<CompleteResult>;
};

type Phase = "practice" | "quiz" | "result";

const POSE: Record<MatchResult["kind"], Pose> = { correct: "wave", almost: "almost", incorrect: "thinking" };

/**
 * One lesson, in the Duolingo style: Capi says each word and the child says it back (hands-free),
 * then a tap-the-syllables quiz, then the results.
 */
export default function LessonScreen({ title, items, words, baseYuzu, review = false, onDone, onAttempt, onQuizAnswer, onNote, onComplete }: Props) {
  const { finalText, partialText, error, busy, finished, heardSpeech, isListening, prepare, start, stop, confidence } = useLiveTranscription();
  const slow = useAppStore((state) => state.slowGuide);
  const setSlow = useAppStore((state) => state.setSlowGuide);
  const guide = useGuideAudio(slow);
  const questions = useMemo(() => buildTapQuiz(words), [words]);

  const [phase, setPhase] = useState<Phase>("practice");
  const [index, setIndex] = useState(0);
  const [result, setResult] = useState<MatchResult | null>(null);
  const [praise, setPraise] = useState<string>(PRAISE[0]);
  const [combo, setCombo] = useState(0);
  const [earned, setEarned] = useState(0);
  const [practiceCorrect, setPracticeCorrect] = useState(0);
  const [quizScore, setQuizScore] = useState({ correct: 0, total: 0 });
  const [saving, setSaving] = useState(false);
  const [summary, setSummary] = useState<CompleteResult | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [flagged, setFlagged] = useState(false);
  const awaitingResult = useRef(false);
  const reported = useRef(false);
  const correctItems = useRef(new Set<string>());
  const quizCorrect = useRef(0);

  const wordSet = useMemo(() => new Set(words), [words]);
  const target = items[index];
  const practiceDone = index >= items.length;
  const isSyllable = target !== undefined && !wordSet.has(target);
  const example = target !== undefined && isSyllable ? exampleFor(target) : null;
  const wordPicture = target !== undefined && !isSyllable ? pictureOf(target) : null;
  const picture = example ? { word: example.word, syllable: target ?? null } : wordPicture ? { word: wordPicture.word, syllable: null } : null;
  const fact = result?.kind === "correct" && target !== undefined ? FACTS[audioKey(target)] : undefined;
  const micBlocked = error !== null && /permission/i.test(error);

  // Get the microphone and a speech key ready while the child looks at the word,
  // so tapping the mic starts listening at once. Does nothing if a fresh key is ready.
  useEffect(() => {
    if (phase === "practice" && !isListening && !practiceDone) void prepare();
  }, [phase, index, result, isListening, practiceDone, prepare]);

  // Capi says each new item (and its example word). The microphone stays closed while he speaks.
  useEffect(() => {
    if (phase !== "practice" || practiceDone || target === undefined) return;
    const lines = example ? [target, example.word] : [target];
    const timer = setTimeout(() => guide.sayAll(lines), 450);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, index, practiceDone, target, guide.sayAll]);

  useEffect(() => {
    if (finished && awaitingResult.current && target !== undefined) {
      awaitingResult.current = false;
      const heardText = `${finalText}${partialText}`;
      const next = matchUtterance(heardText, target);
      setResult(next);
      if (next.kind === "correct") {
        if (!correctItems.current.has(target)) setEarned((n) => n + 1);
        correctItems.current.add(target);
        setPracticeCorrect(correctItems.current.size);
        setPraise(PRAISE[(correctItems.current.size - 1) % PRAISE.length] ?? PRAISE[0]);
        setCombo((n) => n + 1);
      } else {
        setCombo(0);
      }
      onAttempt?.(target, next.heard, next.kind);
    }
  }, [finished, finalText, partialText, target, onAttempt]);

  // Spoken feedback after each answer.
  useEffect(() => {
    if (result) guide.say(result.kind === "correct" ? praise : FEEDBACK[result.kind].voice);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result, guide.say]);

  // Reading part finished: on to the quiz, or straight to the results if there is none.
  useEffect(() => {
    if (!practiceDone || phase !== "practice") return;
    if (questions.length > 0) setPhase("quiz");
    else finish();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [practiceDone, phase]);

  /** Saves the whole lesson once (reading and quiz together), then shows the results. */
  function finish() {
    setPhase("result");
    if (reported.current) return;
    reported.current = true;
    if (!onComplete || review) return;
    setSaving(true);
    onComplete(correctItems.current.size + quizCorrect.current, items.length + questions.length)
      .then(setSummary)
      .catch((caught: unknown) => setSaveError(caught instanceof Error ? caught.message : String(caught)))
      .finally(() => setSaving(false));
  }

  const onMic = () => {
    guide.stop();
    setResult(null);
    setFlagged(false);
    awaitingResult.current = true;
    void start(items);
  };

  const onNext = () => {
    guide.stop();
    setResult(null);
    setFlagged(false);
    setIndex((current) => current + 1);
  };

  const onSkip = () => {
    setCombo(0);
    onNext();
  };

  const close = () => {
    guide.stop();
    stop();
    onDone();
  };

  const toggleSlow = () => setSlow(!slow);
  const total = items.length + questions.length;

  if (phase === "quiz") {
    return (
      <TapQuiz
        questions={questions}
        guide={guide}
        slow={slow}
        onToggleSlow={toggleSlow}
        progressFrom={items.length / total}
        progressSpan={questions.length / total}
        combo={combo}
        yuzu={baseYuzu + earned}
        onAnswer={(word, ok, heard, skipped) => {
          setQuizScore((current) => ({ correct: current.correct + (ok ? 1 : 0), total: current.total + 1 }));
          if (ok) {
            quizCorrect.current += 1;
            setEarned((n) => n + 1);
            setCombo((n) => n + 1);
          } else {
            setCombo(0);
          }
          onQuizAnswer?.(word, ok, heard, skipped);
        }}
        onNote={(word, note) => onNote?.(word, note)}
        onFinish={finish}
        onClose={close}
      />
    );
  }

  if (phase === "result") {
    return (
      <LessonResult
        title={title}
        practice={{ correct: practiceCorrect, total: items.length }}
        quiz={quizScore.total > 0 ? quizScore : null}
        yuzu={earned}
        review={review}
        summary={summary}
        saving={saving}
        saveError={saveError}
        guide={guide}
        onDone={onDone}
      />
    );
  }

  if (practiceDone || target === undefined) return <View style={styles.root} />;

  const pose: Pose = result ? POSE[result.kind] : "rest";
  const sheetUp = result !== null && !isListening;
  const parts = syllabify(target);
  const slash = parts.map((part) => `/${part}/`).join(" ... ");
  const heardLine = result && result.heard !== "" ? `Narinig ni Capi: ${result.heard}` : "Walang narinig si Capi.";
  const dev = __DEV__ ? <Text style={styles.dev}>Linaw: {confidence === null ? "-" : `${Math.round(confidence * 100)}%`}</Text> : null;
  const last = index + 1 >= items.length;

  const sheet =
    sheetUp && result ? (
      result.kind === "correct" ? (
        <FeedbackSheet
          good
          title="Magaling magsalita!"
          kicker="Narinig ni Capi:"
          line={`${parts.join("-")}, tamang-tama ang tunog!`}
          primaryLabel={last && questions.length === 0 ? "Tapusin" : "Susunod"}
          onPrimary={onNext}
          onFlag={() => {
            setFlagged(true);
            onNote?.(target, "na-flag");
          }}
          flagged={flagged}
        >
          {fact ? (
            <View style={styles.fact}>
              <Text style={styles.factTitle}>ALAM MO BA?</Text>
              <Text style={styles.factText}>{fact}</Text>
            </View>
          ) : null}
          {dev}
        </FeedbackSheet>
      ) : (
        <FeedbackSheet
          good={false}
          title={result.kind === "almost" ? "Halos tama!" : "Subukan ulit"}
          kicker="Subukan ulit:"
          line={`${slash}, dahan-dahan lang`}
          primaryLabel="Subukan muli"
          onPrimary={onMic}
          linkLabel="Laktawan"
          onLink={onSkip}
          onFlag={() => {
            setFlagged(true);
            onNote?.(target, "na-flag");
          }}
          flagged={flagged}
        >
          <Text style={styles.heard}>{heardLine}</Text>
          {dev}
        </FeedbackSheet>
      )
    ) : null;

  return (
    <RepeatView
      item={target}
      isSyllable={isSyllable}
      picture={picture}
      progress={index / total}
      combo={combo}
      yuzu={baseYuzu + earned}
      talking={guide.speaking}
      listening={isListening}
      pose={pose}
      verdict={sheetUp && result ? result.kind : null}
      micState={micBlocked ? "blocked" : isListening ? "live" : "ready"}
      micWaiting={guide.speaking || busy}
      slow={slow}
      canSpeak={guide.has(target) && !guide.speaking}
      onToggleSlow={toggleSlow}
      onSpeaker={() => guide.sayAll(example ? [target, example.word] : [target])}
      onMic={isListening ? stop : guide.speaking || busy ? () => undefined : onMic}
      onSkip={onSkip}
      onClose={close}
      sheet={sheet}
    />
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  fact: { backgroundColor: colors.white, borderRadius: 16, borderWidth: 2, borderColor: colors.border, padding: 12, gap: 2 },
  factTitle: { fontFamily: font.bold, fontSize: 12, letterSpacing: 1.4, color: "#8A6100" },
  factText: { fontFamily: font.body, fontSize: 16, lineHeight: 22, color: colors.ink },
  heard: { fontFamily: font.body, fontSize: 15, color: "#6B2A1E" },
  dev: { fontFamily: font.body, fontSize: 12, color: colors.muted },
});
