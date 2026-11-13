import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { playSfx } from "../../hooks/useSfx";
import { Pressable, ScrollView, Share, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { QuizQuestion } from "../../content/quiz";
import { MEANINGS } from "../../content/meanings";
import type { useGuideAudio } from "../../hooks/useGuideAudio";
import { useLang, useT, type Line } from "../../i18n";
import { colors } from "../../theme/colors";
import { font } from "../../theme/fonts";
import Bubble from "../ui/Bubble";
import Button3D from "../ui/Button3D";
import { WaveIcon } from "../ui/Icons";
import TextLink from "../ui/TextLink";
import Tile, { TileSlot } from "../ui/Tile";
import CapiActor from "./CapiActor";
import ExerciseFrame from "./ExerciseFrame";
import ExplainScreen from "./ExplainScreen";
import FeedbackSheet from "./FeedbackSheet";
import { praiseAt } from "./lessonText";
import RoundSpeaker from "./RoundSpeaker";
import { useCoach, type CoachVoice } from "../../guides/coach";
import WordPicture from "../art/WordPicture";
import { GuideTarget } from "./GuideHint";

type Props = {
  questions: readonly QuizQuestion[];
  coachVoice?: CoachVoice;
  guide: ReturnType<typeof useGuideAudio>;
  /** The share of the lesson bar already filled when the quiz starts, and how much the quiz adds. */
  progressFrom: number;
  progressSpan: number;
  combo: number;
  yuzu: number;
  /** Called once per question. `skipped` is true when the child chose not to listen. */
  onAnswer: (word: string, ok: boolean, heard: string, skipped: boolean) => void;
  /** A flag or a thumb on a question, saved with the child's answers. */
  onNote: (word: string, note: string) => void;
  onFinish: () => void;
  onClose: () => void;
};

/** "Pindutin ang naririnig mo": Capi says a word and the child taps its syllables in order. */
export default function TapQuiz(props: Props) {
  const { questions, guide, onAnswer, onNote, onFinish, onClose } = props;
  const t = useT();
  const lang = useLang();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [qi, setQi] = useState(0);
  const [placed, setPlaced] = useState<string[]>([]);
  const [checked, setChecked] = useState<{ ok: boolean } | null>(null);
  const [explaining, setExplaining] = useState(false);
  const [flagged, setFlagged] = useState(false);
  const [praise, setPraise] = useState<Line | null>(null);
  const praiseIndex = useRef(0);
  const [picked, setPicked] = useState<string | null>(null);

  const question = questions[qi];
  // First-time guide for this kind of question: shown once per kind, then retired (see guides/coach.ts).
  const guideId = question?.kind === "choice" ? "quiz_picture_choice" : "quiz_syllable_build";
  const coach = useCoach([guideId], props.coachVoice);
  const capiSize = Math.min(184, Math.round(width * 0.47));

  // Capi says each new word. Replaying with the speaker keeps using the slow setting.
  useEffect(() => {
    if (!question) return;
    const timer = setTimeout(() => guide.say(question.word), 450);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qi, question?.word]);

  const byId = useMemo(() => new Map((question?.kind === "build" ? question.tiles : []).map((tile) => [tile.id, tile])), [question]);
  const placedLabels = placed.map((id) => byId.get(id)?.label ?? "");

  const next = useCallback(() => {
    guide.stop();
    setExplaining(false);
    setChecked(null);
    setPlaced([]);
    setPicked(null);
    setFlagged(false);
    setPraise(null);
    if (qi + 1 >= questions.length) onFinish();
    else setQi((current) => current + 1);
  }, [guide, qi, questions.length, onFinish]);

  if (!question) return null;

  const check = () => {
    const ok = question.kind === "choice" ? picked === question.word : placedLabels.join("") === question.word;
    setChecked({ ok });
    onAnswer(question.word, ok, question.kind === "choice" ? (picked ?? "") : placedLabels.join("-"), false);
    if (ok) {
      const line = praiseAt(praiseIndex.current, guide.has);
      praiseIndex.current += 1;
      setPraise(line);
      guide.say(line);
    }
  };

  const skip = () => {
    guide.stop();
    onAnswer(question.word, false, "", true);
    next();
  };

  const tileState = (label: string, i: number) =>
    !checked ? "normal" : checked.ok ? "right" : label === question.syllables[i] ? "right" : "wrong";
  const choiceStyle = {
    normal: { backgroundColor: colors.white, borderColor: colors.line },
    pick: { backgroundColor: colors.infoBg, borderColor: colors.infoDark },
    right: { backgroundColor: colors.primaryBg, borderColor: colors.primary },
    wrong: { backgroundColor: colors.dangerBg, borderColor: colors.danger },
  } as const;

  const meaning = MEANINGS[question.word.toLowerCase()];
  const dotted = question.syllables.join("·");
  const pose = checked ? (checked.ok ? "cheer" : "almost") : "rest";
  const progress = props.progressFrom + props.progressSpan * ((qi + (checked ? 1 : 0)) / questions.length);

  return (
    <ExerciseFrame title={t("tapQuizTitle")} progress={progress} combo={props.combo} yuzu={props.yuzu} onClose={onClose}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.top}>
          <CapiActor size={capiSize} talking={guide.speaking} listening={false} pose={pose} />
          <View style={styles.right}>
            <Bubble tail="left" tailTop={50} style={styles.bubble}>
              <RoundSpeaker size={46} disabled={guide.speaking} onPress={() => guide.say(question.word)} />
              {question.kind === "build" && question.picture ? (
                <View style={styles.thumb}>
                  <WordPicture word={question.word} size={56} />
                </View>
              ) : (
                <WaveIcon width={Math.max(36, Math.min(96, width - capiSize - 148))} height={40} />
              )}
            </Bubble>
            <TextLink
              label={t("slowText")}
              color={colors.infoInk}
              style={styles.slow}
              onPress={() => guide.say(question.word, { slow: true })}
            />
          </View>
        </View>

        {question.kind === "choice" ? (
          <>
        <View style={styles.choiceWrap}>
          <View style={styles.pictureCard}>
            <WordPicture word={question.word} size={132} />
          </View>
          {question.choices.map((choice, i) => {
            const on = picked === choice;
            const state = !checked ? (on ? "pick" : "normal") : choice === question.word ? "right" : on ? "wrong" : "normal";
            return (
              <GuideTarget
                key={choice}
                direction="left"
                show={coach.current === "quiz_picture_choice" && !checked && i === 0}
                onDismiss={() => coach.done("quiz_picture_choice")}
                okLabel={t("guideOk")}
                width={Math.min(260, width - 140)}
                height={64}
                arrowSize={52}
              >
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={choice}
                  disabled={checked !== null}
                  onPress={() => {
                    void playSfx("tap", 0.5);
                    coach.done("quiz_picture_choice");
                    setPicked(choice);
                  }}
                  style={[styles.choice, choiceStyle[state]]}
                >
                  <Text style={[styles.choiceText, state === "pick" && { color: colors.infoInk }, state === "right" && { color: colors.primaryInk }, state === "wrong" && { color: colors.dangerDark }]}>{choice}</Text>
                </Pressable>
              </GuideTarget>
            );
          })}
        </View>
          </>
        ) : (
          <>
        <View style={styles.answer}>
          <View style={styles.line} />
          <View style={[styles.line, { top: 146 }]} />
          <View style={styles.answerTiles}>
            {placed.map((id, i) => {
              const tile = byId.get(id);
              if (!tile) return null;
              return (
                <Tile
                  key={id}
                  label={tile.label}
                  state={tileState(tile.label, i)}
                  disabled={checked !== null}
                  onPress={() => {
                    void playSfx("tap", 0.5);
                    setPlaced((current) => current.filter((x) => x !== id));
                  }}
                />
              );
            })}
          </View>
        </View>

        <View style={styles.bank}>
          {question.tiles.map((tile) =>
            placed.includes(tile.id) ? (
              <TileSlot key={tile.id} />
            ) : (
              <GuideTarget
                key={tile.id}
                direction="down"
                show={coach.current === "quiz_syllable_build" && !checked && tile.id === question.tiles[0]?.id}
                onDismiss={() => coach.done("quiz_syllable_build")}
                okLabel={t("guideOk")}
                width={84}
                height={64}
                arrowSize={56}
              >
                <Tile
                  size="bank"
                  label={tile.label}
                  disabled={checked !== null}
                  onPress={() => {
                    void playSfx("tap", 0.5);
                    coach.done("quiz_syllable_build");
                    setPlaced((current) => [...current, tile.id]);
                  }}
                />
              </GuideTarget>
            ),
          )}
        </View>
          </>
        )}
      </ScrollView>

      {!checked ? (
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) + 6 }]}>
          <TextLink label={t("cantListen")} onPress={skip} />
          <Button3D label={t("check")} disabled={question.kind === "choice" ? picked === null : placed.length === 0} onPress={check} />
        </View>
      ) : (
        <FeedbackSheet
          good={checked.ok}
          title={checked.ok ? (praise ? praise[lang] : t("tapRightTitle")) : t("tapWrongTitle")}
          kicker={checked.ok ? t("tapMeaning") : t("tapAnswer")}
          line={checked.ok ? (meaning ? `${question.word}: ${meaning}` : question.word) : dotted}
          primaryLabel={qi + 1 >= questions.length ? t("finish") : t("next")}
          onPrimary={next}
          outlineLabel={t("explain")}
          onOutline={() => setExplaining(true)}
          onShare={checked.ok ? () => void Share.share({ message: `Natutunan ko ang salitang "${question.word}" sa Basa-Bata!` }) : undefined}
          onFlag={() => {
            setFlagged(true);
            onNote(question.word, "na-flag");
          }}
          flagged={flagged}
        />
      )}

      {explaining ? (
        <ExplainScreen
          word={question.word}
          onBack={() => setExplaining(false)}
          onContinue={next}
          onRate={(note) => onNote(question.word, note)}
        />
      ) : null}
    </ExerciseFrame>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 20, paddingBottom: 24 },
  top: { flexDirection: "row", alignItems: "flex-start", marginLeft: -14, marginTop: 4 },
  right: { flex: 1, marginTop: 36, marginLeft: -6 },
  bubble: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 82, paddingHorizontal: 12, paddingVertical: 0 },
  slow: { alignSelf: "flex-end", paddingHorizontal: 4 },
  answer: { height: 148, marginTop: 8 },
  line: { position: "absolute", left: 0, right: 0, top: 72, height: 2, backgroundColor: "#A9CFE0" },
  answerTiles: { position: "absolute", left: 0, right: 0, top: 8, flexDirection: "row", flexWrap: "wrap", columnGap: 10, rowGap: 16 },
  thumb: { width: 60, height: 60, alignItems: "center", justifyContent: "center" },
  choiceWrap: { alignItems: "center", gap: 12, marginTop: 6 },
  pictureCard: {
    width: 160,
    height: 160,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
    backgroundColor: colors.white,
    borderWidth: 2,
    borderBottomWidth: 6,
    borderColor: colors.border,
    borderRadius: 26,
  },
  choice: { height: 64, minWidth: 200, maxWidth: 260, paddingHorizontal: 28, alignItems: "center", justifyContent: "center", borderWidth: 2, borderBottomWidth: 6, borderRadius: 18 },
  choiceText: { fontFamily: font.display, fontSize: 32, lineHeight: 46, color: colors.ink, includeFontPadding: false },
  bank: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 14, marginTop: 24 },
  footer: { paddingHorizontal: 20, gap: 4, paddingTop: 4, backgroundColor: colors.bg },
});
