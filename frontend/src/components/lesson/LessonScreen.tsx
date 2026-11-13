import { FACTS, audioKey, matchUtterance, type MatchResult } from "@marungko/shared";
import { acceptedFor } from "../../content/accepted";
import { partsFor } from "../../content/parts";
import { decideAttempt, type Reason } from "../../speech/attempt";
import { WORD_MS } from "../../speech/wordPace";
import { useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { buildTapQuiz, quizSize } from "../../content/quiz";
import { syllabify } from "../../content/syllables";
import { invalidatePlaybackMode, useGuideAudio, type Sayable } from "../../hooks/useGuideAudio";
import { STT_CONTEXT_MODE, useLiveTranscription } from "../../hooks/useLiveTranscription";
import { playSfx } from "../../hooks/useSfx";
import { useLang, useT, type Line } from "../../i18n";
import type { CompleteResult } from "../../services/progress";
import { useAppStore } from "../../store/useAppStore";
import { colors } from "../../theme/colors";
import { font } from "../../theme/fonts";
import type { Pose } from "../art/assets";
import FeedbackSheet from "./FeedbackSheet";
import LessonResult from "./LessonResult";
import { FEEDBACK, PRAISE, praiseAt } from "./lessonText";
import MicTutorial from "./MicTutorial";
import PartIntro from "./PartIntro";
import { exampleFor, pictureOf } from "./pictures";
import RepeatView from "./RepeatView";
import TapQuiz from "./TapQuiz";

/** What the end of a lesson shows: the saved XP and streak, and any medals this lesson earned. */
export type LessonSummary = CompleteResult & { medals: string[]; streakUp: boolean };

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
  onComplete?: (correct: number, total: number) => Promise<LessonSummary>;
};

type Phase = "intro" | "practice" | "quiz" | "result";

const POSE: Record<MatchResult["kind"], Pose> = { correct: "wave", almost: "almost", incorrect: "tryAgain" };

/**
 * A right answer is accepted once the words match AND the child has stopped making sound (a quiet moment at the end),
 * so a sound that is still going ("moooo") is measured to its end before it is judged. Never sooner than
 * EARLY_ACCEPT_MS after the match, and never later than EARLY_ACCEPT_MAX_MS (a noisy room never goes quiet).
 */
const EARLY_ACCEPT_MS = 450;
const QUIET_ACCEPT_MS = 250;
const EARLY_ACCEPT_MAX_MS = 2200;

/**
 * One lesson, in the Duolingo style: Capi says each word and the child says it back (hands-free), then a
 * tap-the-syllables quiz, then the results. The lesson is taught in parts by number of syllables (one syllable, then
 * two, ...), each with its own quiz, so a quiz only asks for what that part taught.
 */
export default function LessonScreen({ title, items, words, baseYuzu, review = false, onDone, onAttempt, onQuizAnswer, onNote, onComplete }: Props) {
  const { finalText, partialText, error, busy, finished, heardSpeech, isListening, prepare, start, stop, finishNow, confidence, readAttempt, quietForMs } = useLiveTranscription();
  const t = useT();
  const lang = useLang();
  const seenTutorial = useAppStore((state) => state.seenMicTutorial);
  const setSeenTutorial = useAppStore((state) => state.setSeenMicTutorial);
  const [tutorial, setTutorial] = useState(!seenTutorial && !review);
  const guide = useGuideAudio();

  const itemsKey = items.join("|");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const parts = useMemo(() => partsFor(items), [itemsKey]);
  const [partIndex, setPartIndex] = useState(0);
  const part = parts[partIndex];
  const partItems = part?.items ?? [];
  const questions = useMemo(() => buildTapQuiz(partItems), [part]); // eslint-disable-line react-hooks/exhaustive-deps
  // Items and quiz questions of every part: the progress bar fills across the whole lesson.
  const sizes = useMemo(() => parts.map((p) => p.items.length + quizSize(p.items)), [parts]);
  const total = sizes.reduce((sum, size) => sum + size, 0);
  const before = sizes.slice(0, partIndex).reduce((sum, size) => sum + size, 0);

  const [phase, setPhase] = useState<Phase>(parts.length > 1 ? "intro" : "practice");
  const [index, setIndex] = useState(0);
  const [result, setResult] = useState<MatchResult | null>(null);
  // Why the last attempt was not a pass ("too-fast" and "too-long" get their own message), and how many tries in a row this word has had.
  const [reason, setReason] = useState<Reason>("ok");
  const [misses, setMisses] = useState(0);
  const [devLine, setDevLine] = useState("");
  const [praise, setPraise] = useState<Line>(PRAISE[0] ?? { fil: "Tama!", en: "That's right!" });
  const [combo, setCombo] = useState(0);
  const [earned, setEarned] = useState(0);
  const [practiceCorrect, setPracticeCorrect] = useState(0);
  const [quizScore, setQuizScore] = useState({ correct: 0, total: 0 });
  const [saving, setSaving] = useState(false);
  const [summary, setSummary] = useState<LessonSummary | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [flagged, setFlagged] = useState(false);
  const awaitingResult = useRef(false);
  const reported = useRef(false);
  const correctItems = useRef(new Set<string>());
  const quizCorrect = useRef(0);
  const quizAsked = useRef(0);
  const praiseCount = useRef(0);
  const matchedAt = useRef<number | null>(null);

  const wordSet = useMemo(() => new Set(words), [words]);
  const target = partItems[index];
  const practiceDone = index >= partItems.length;
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

  // Capi says each new item, and only the item: the example word is shown with its picture, never spoken.
  // The microphone can be tapped at any time; it simply stops Capi.
  useEffect(() => {
    if (phase !== "practice" || practiceDone || target === undefined || tutorial) return;
    const timer = setTimeout(() => guide.sayAll([target]), 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, index, partIndex, practiceDone, target, tutorial, guide.sayAll]);

  useEffect(() => {
    if (finished && awaitingResult.current && target !== undefined) {
      awaitingResult.current = false;
      const heardText = `${finalText}${partialText}`;
      const attempt = readAttempt();
      const decision = decideAttempt({
        heard: heardText,
        target,
        accepted: acceptedFor(target),
        syllables: syllabify(target).length,
        spanMs: attempt.spanMs,
        modelMs: WORD_MS[audioKey(target)],
        leadMs: attempt.leadMs,
        confidence: attempt.confidence,
      });
      const next = decision.result;
      setResult(next);
      setReason(decision.reason);
      setMisses((n) => (next.kind === "correct" ? 0 : n + 1));
      if (__DEV__) {
        // Numbers only, never audio: copy these from the Metro console to calibrate (docs/SPEECH-CHECK.md section 8).
        const row = {
          target,
          context: STT_CONTEXT_MODE,
          heard: next.heard,
          kind: next.kind,
          reason: decision.reason,
          spanMs: attempt.spanMs,
          leadMs: attempt.leadMs,
          tokenSpanMs: attempt.tokenSpanMs,
          ratio: decision.pace ? Number(decision.pace.ratio.toFixed(2)) : null,
          sps: decision.pace ? Number(decision.pace.syllablesPerSecond.toFixed(1)) : null,
          confidence: attempt.confidence === null ? null : Number(attempt.confidence.toFixed(2)),
          lowConfidence: decision.lowConfidence,
        };
        console.log(`[speech] ${JSON.stringify(row)}`);
        setDevLine(`${attempt.spanMs ?? "-"} ms, x${row.ratio ?? "-"} of the model, ${row.sps ?? "-"} syll/s`);
      }
      if (next.kind === "correct") {
        if (!correctItems.current.has(target)) setEarned((n) => n + 1);
        correctItems.current.add(target);
        setPracticeCorrect(correctItems.current.size);
        setPraise(praiseAt(praiseCount.current, guide.has));
        praiseCount.current += 1;
        setCombo((n) => n + 1);
      } else {
        setCombo(0);
      }
      onAttempt?.(target, next.heard, next.kind);
    }
  }, [finished, finalText, partialText, target, onAttempt, readAttempt]); // eslint-disable-line react-hooks/exhaustive-deps

  // The words match: accept them once the child has stopped making sound, without waiting for the speech service to
  // notice a pause. Waiting for the quiet is what lets a held sound ("moooo") be measured to its end.
  useEffect(() => {
    if (!isListening || !heardSpeech || target === undefined || phase !== "practice") return;
    if (matchUtterance(`${finalText}${partialText}`, target, acceptedFor(target)).kind !== "correct") return;
    if (matchedAt.current === null) matchedAt.current = Date.now();
    const timer = setInterval(() => {
      const waited = Date.now() - (matchedAt.current ?? Date.now());
      const quiet = quietForMs();
      if ((waited >= EARLY_ACCEPT_MS && quiet !== null && quiet >= QUIET_ACCEPT_MS) || waited >= EARLY_ACCEPT_MAX_MS) {
        clearInterval(timer);
        finishNow();
      }
    }, 50);
    return () => clearInterval(timer);
  }, [isListening, heardSpeech, finalText, partialText, target, phase, finishNow, quietForMs]);

  // A chime and then Capi's voice after each answer.
  useEffect(() => {
    if (!result) return;
    if (result.kind === "correct") {
      void playSfx("correct");
      const timer = setTimeout(() => guide.say(praise), 380);
      return () => clearTimeout(timer);
    }
    // Too fast and too long are not mistakes: no buzzer, just Capi asking to slow down or keep the sound short.
    // From the second miss in a row Capi also says the word again, so the child hears it once more before trying.
    const gentle = reason === "too-fast" || reason === "too-long";
    if (!gentle) void playSfx("wrong", 0.6);
    const lines: Sayable[] =
      misses >= 3
        ? [FEEDBACK.moveOn]
        : reason === "too-fast"
          ? [FEEDBACK.slow, FEEDBACK.slowThen]
          : reason === "too-long"
            ? [FEEDBACK.short, ...(target !== undefined ? [target] : [])]
            : [result.kind === "almost" ? FEEDBACK.almost : FEEDBACK.again];
    if (misses === 2 && target !== undefined && reason !== "too-long") lines.push(target);
    const timer = setTimeout(() => guide.sayAll(lines), 520);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result, guide.say]);

  // Reading part finished: on to its quiz, or to the next part, or straight to the results if there is nothing left.
  useEffect(() => {
    if (!practiceDone || phase !== "practice") return;
    if (questions.length > 0) setPhase("quiz");
    else goNextPart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [practiceDone, phase]);

  /** The quiz of this part is over: the next part starts with its own introduction, or the lesson ends. */
  function goNextPart() {
    guide.stop();
    if (partIndex + 1 < parts.length) {
      setPartIndex(partIndex + 1);
      setIndex(0);
      setResult(null);
      setReason("ok");
      setMisses(0);
      setFlagged(false);
      setPhase("intro");
    } else {
      finish();
    }
  }

  /** Saves the whole lesson once (reading and quiz together), then shows the results. */
  function finish() {
    setPhase("result");
    if (reported.current) return;
    reported.current = true;
    if (!onComplete || review) return;
    setSaving(true);
    onComplete(correctItems.current.size + quizCorrect.current, items.length + quizAsked.current)
      .then(setSummary)
      .catch((caught: unknown) => setSaveError(caught instanceof Error ? caught.message : String(caught)))
      .finally(() => setSaving(false));
  }

  const onMic = () => {
    guide.stop();
    invalidatePlaybackMode();
    setResult(null);
    setReason("ok");
    setFlagged(false);
    matchedAt.current = null;
    awaitingResult.current = true;
    void start(items, target);
  };

  const onNext = () => {
    guide.stop();
    setResult(null);
    setReason("ok");
    setMisses(0);
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

  if (phase === "intro" && part) {
    return (
      <PartIntro
        key={part.id}
        part={part}
        number={partIndex + 1}
        total={parts.length}
        progress={total > 0 ? before / total : 0}
        combo={combo}
        yuzu={baseYuzu + earned}
        onStart={() => setPhase("practice")}
        onClose={close}
      />
    );
  }

  if (phase === "quiz" && part) {
    return (
      <TapQuiz
        key={part.id}
        questions={questions}
        guide={guide}
        progressFrom={total > 0 ? (before + partItems.length) / total : 0}
        progressSpan={total > 0 ? questions.length / total : 0}
        combo={combo}
        yuzu={baseYuzu + earned}
        onAnswer={(word, ok, heard, skipped) => {
          quizAsked.current += 1;
          setQuizScore((current) => ({ correct: current.correct + (ok ? 1 : 0), total: current.total + 1 }));
          if (ok) {
            void playSfx("correct");
            quizCorrect.current += 1;
            setEarned((n) => n + 1);
            setCombo((n) => n + 1);
          } else {
            if (!skipped) void playSfx("wrong", 0.6);
            setCombo(0);
          }
          onQuizAnswer?.(word, ok, heard, skipped);
        }}
        onNote={(word, note) => onNote?.(word, note)}
        onFinish={goNextPart}
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

  // Capi covers his ears when he heard nothing (a noisy room or a quiet child), and looks for the microphone if the phone has none.
  const micMissing = error !== null && !micBlocked && /no (audio )?(input|microphone)|input device|audio source|record(er)? (is )?(not|un)available/i.test(error);
  const pose: Pose = result
    ? result.kind !== "correct" && result.heard === ""
      ? "tooNoisy"
      : POSE[result.kind]
    : micBlocked
      ? "micBlocked"
      : micMissing
        ? "noMic"
        : "rest";
  const sheetUp = result !== null && !isListening;
  const targetSyllables = syllabify(target);
  const slash = targetSyllables.map((syllable) => `/${syllable}/`).join(" ... ");
  const heardLine = result && result.heard !== "" ? t("heardLine", { heard: result.heard }) : t("heardNothing");
  const dev = __DEV__ ? (
    <Text style={styles.dev}>
      Linaw: {confidence === null ? "-" : `${Math.round(confidence * 100)}%`}
      {devLine !== "" ? `  |  ${devLine}` : ""}
    </Text>
  ) : null;
  // After three tries in a row the child is never kept stuck: moving on is the main button.
  const moveOn = misses >= 3;
  const tooFast = reason === "too-fast";
  const tooLong = reason === "too-long";
  const lastOfLesson = partIndex + 1 >= parts.length && index + 1 >= partItems.length && questions.length === 0;

  const sheet =
    sheetUp && result ? (
      result.kind === "correct" ? (
        <FeedbackSheet
          good
          title={praise[lang]}
          kicker={t("heardKicker")}
          line={t("rightLine", { parts: targetSyllables.join("-") })}
          primaryLabel={lastOfLesson ? t("finish") : t("next")}
          onPrimary={onNext}
          onFlag={() => {
            setFlagged(true);
            onNote?.(target, "na-flag");
          }}
          flagged={flagged}
        >
          {fact ? (
            <View style={styles.fact}>
              <Text style={styles.factTitle}>{t("didYouKnow")}</Text>
              <Text style={styles.factText}>{fact}</Text>
            </View>
          ) : null}
          {dev}
        </FeedbackSheet>
      ) : (
        <FeedbackSheet
          good={false}
          title={moveOn ? t("moveOnTitle") : tooFast ? t("slowTitle") : tooLong ? t("shortTitle") : result.kind === "almost" ? t("almostTitle") : t("tryAgainTitle")}
          kicker={tooFast ? t("slowKicker") : tooLong ? t("shortKicker") : t("tryKicker")}
          line={tooFast || tooLong ? slash : t("slowlyNote", { slash })}
          primaryLabel={moveOn ? t("moveOnButton") : t("retryButton")}
          onPrimary={moveOn ? onSkip : onMic}
          linkLabel={moveOn ? t("retryButton") : t("skipLink")}
          onLink={moveOn ? onMic : onSkip}
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
    <View style={styles.root}>
    <RepeatView
      item={target}
      isSyllable={isSyllable}
      picture={picture}
      progress={total > 0 ? (before + index) / total : 0}
      combo={combo}
      yuzu={baseYuzu + earned}
      talking={guide.speaking}
      listening={isListening}
      pose={pose}
      verdict={sheetUp && result ? result.kind : null}
      micState={micBlocked ? "blocked" : isListening ? "live" : "ready"}
      micWaiting={busy}
      canSpeak={guide.has(target)}
      onSpeaker={() => guide.sayAll([target])}
      onSlowSpeaker={() => guide.sayAll([target], { slow: true })}
      onMic={isListening ? stop : busy ? () => undefined : onMic}
      onSkip={onSkip}
      onClose={close}
      sheet={sheet}
    />
      {tutorial ? (
        <MicTutorial
          onClose={() => {
            setTutorial(false);
            setSeenTutorial(true);
          }}
        />
      ) : null}
    </View>
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
