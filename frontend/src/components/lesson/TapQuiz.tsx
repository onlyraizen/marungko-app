import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { playSfx } from "../../hooks/useSfx";
import { ScrollView, Share, StyleSheet, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { TapQuestion } from "../../content/quiz";
import { MEANINGS } from "../../content/meanings";
import type { useGuideAudio } from "../../hooks/useGuideAudio";
import { colors } from "../../theme/colors";
import Bubble from "../ui/Bubble";
import Button3D from "../ui/Button3D";
import { WaveIcon } from "../ui/Icons";
import TextLink from "../ui/TextLink";
import Tile, { TileSlot } from "../ui/Tile";
import CapiActor from "./CapiActor";
import ExerciseFrame from "./ExerciseFrame";
import ExplainScreen from "./ExplainScreen";
import FeedbackSheet from "./FeedbackSheet";
import { PRAISE } from "./lessonText";
import RoundSpeaker from "./RoundSpeaker";
import SlowLink from "./SlowLink";

type Props = {
  questions: readonly TapQuestion[];
  guide: ReturnType<typeof useGuideAudio>;
  slow: boolean;
  onToggleSlow: () => void;
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
  const { questions, guide, slow, onToggleSlow, onAnswer, onNote, onFinish, onClose } = props;
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [qi, setQi] = useState(0);
  const [placed, setPlaced] = useState<string[]>([]);
  const [checked, setChecked] = useState<{ ok: boolean } | null>(null);
  const [explaining, setExplaining] = useState(false);
  const [flagged, setFlagged] = useState(false);
  const praiseIndex = useRef(0);

  const question = questions[qi];
  const capiSize = Math.min(184, Math.round(width * 0.47));

  // Capi says each new word. Replaying with the speaker keeps using the slow setting.
  useEffect(() => {
    if (!question) return;
    const timer = setTimeout(() => guide.say(question.word), 450);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qi, question?.word]);

  const byId = useMemo(() => new Map((question?.tiles ?? []).map((tile) => [tile.id, tile])), [question]);
  const placedLabels = placed.map((id) => byId.get(id)?.label ?? "");

  const next = useCallback(() => {
    guide.stop();
    setExplaining(false);
    setChecked(null);
    setPlaced([]);
    setFlagged(false);
    if (qi + 1 >= questions.length) onFinish();
    else setQi((current) => current + 1);
  }, [guide, qi, questions.length, onFinish]);

  if (!question) return null;

  const check = () => {
    const ok = placedLabels.join("") === question.word;
    setChecked({ ok });
    onAnswer(question.word, ok, placedLabels.join("-"), false);
    if (ok) {
      guide.say(PRAISE[praiseIndex.current % PRAISE.length] ?? "Tama!");
      praiseIndex.current += 1;
    }
  };

  const skip = () => {
    guide.stop();
    onAnswer(question.word, false, "", true);
    next();
  };

  const tileState = (label: string, i: number) =>
    !checked ? "normal" : checked.ok ? "right" : label === question.syllables[i] ? "right" : "wrong";

  const meaning = MEANINGS[question.word.toLowerCase()];
  const dotted = question.syllables.join("·");
  const pose = checked ? (checked.ok ? "cheer" : "almost") : "rest";
  const progress = props.progressFrom + props.progressSpan * ((qi + (checked ? 1 : 0)) / questions.length);

  return (
    <ExerciseFrame title="Pindutin ang naririnig mo" progress={progress} combo={props.combo} yuzu={props.yuzu} onClose={onClose}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.top}>
          <CapiActor size={capiSize} talking={guide.speaking} listening={false} pose={pose} />
          <View style={styles.right}>
            <Bubble tail="left" tailTop={50} style={styles.bubble}>
              <RoundSpeaker size={46} disabled={guide.speaking} onPress={() => guide.say(question.word)} />
              <WaveIcon width={Math.max(60, Math.min(96, width - capiSize - 130))} height={40} />
            </Bubble>
            <View style={styles.slow}>
              <SlowLink on={slow} onPress={onToggleSlow} />
            </View>
          </View>
        </View>

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
              <Tile
                key={tile.id}
                size="bank"
                label={tile.label}
                disabled={checked !== null}
                onPress={() => {
                  void playSfx("tap", 0.5);
                  setPlaced((current) => [...current, tile.id]);
                }}
              />
            ),
          )}
        </View>
      </ScrollView>

      {!checked ? (
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) + 6 }]}>
          <TextLink label="DI MAKAPAKINIG NGAYON" onPress={skip} />
          <Button3D label="Suriin" disabled={placed.length === 0} onPress={check} />
        </View>
      ) : (
        <FeedbackSheet
          good={checked.ok}
          title={checked.ok ? "Magaling!" : "Hindi pa tama"}
          kicker={checked.ok ? "Kahulugan:" : "Tamang sagot:"}
          line={checked.ok ? (meaning ? `${question.word}: ${meaning}` : question.word) : dotted}
          primaryLabel={qi + 1 >= questions.length ? "Tapusin" : "Susunod"}
          onPrimary={next}
          outlineLabel="Ipaliwanag ang sagot ko"
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
  slow: { alignSelf: "flex-end", marginTop: 6 },
  answer: { height: 148, marginTop: 8 },
  line: { position: "absolute", left: 0, right: 0, top: 72, height: 2, backgroundColor: "#A9CFE0" },
  answerTiles: { position: "absolute", left: 0, right: 0, top: 8, flexDirection: "row", flexWrap: "wrap", columnGap: 10, rowGap: 16 },
  bank: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 14, marginTop: 24 },
  footer: { paddingHorizontal: 20, gap: 4, paddingTop: 4, backgroundColor: colors.bg },
});
