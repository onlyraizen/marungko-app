import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { useGuideAudio } from "../../hooks/useGuideAudio";
import { colors } from "../../theme/colors";
import { font } from "../../theme/fonts";
import type { Pose } from "../art/assets";
import Button3D from "../ui/Button3D";
import FeedbackSheet from "./FeedbackSheet";
import LessonHeader from "./LessonHeader";
import { PRAISE } from "./lessonText";
import type { QuizQuestion } from "./pictures";
import { SpeakerButton } from "./SpeakerButton";
import Stage from "./Stage";

type Props = {
  questions: readonly QuizQuestion[];
  guide: ReturnType<typeof useGuideAudio>;
  slow: boolean;
  onToggleSlow: () => void;
  onClose: () => void;
  onFinish: (correct: number, total: number) => void;
};

const cap = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** "Piliin ang tamang larawan": Capi says a word and the child taps its picture. */
export default function PictureQuiz({ questions, guide, slow, onToggleSlow, onClose, onFinish }: Props) {
  const [qi, setQi] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [score, setScore] = useState(0);
  const question = questions[qi];

  // Capi says the word when a question appears.
  useEffect(() => {
    if (!question) return;
    const timer = setTimeout(() => guide.say(question.answer.word), 450);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qi, guide.say]);

  if (!question) return <View style={styles.root} />;

  const right = picked === question.answer.emoji;
  const last = qi + 1 >= questions.length;
  const pose: Pose = checked ? (right ? "cheer" : "thinking") : "point";

  const check = () => {
    if (picked === null) return;
    setChecked(true);
    if (right) setScore((s) => s + 1);
    guide.say(right ? (PRAISE[qi % PRAISE.length] ?? "Tama!") : "Subukan ulit.");
  };

  const next = () => {
    guide.stop();
    if (last) {
      onFinish(score, questions.length);
      return;
    }
    setQi((n) => n + 1);
    setPicked(null);
    setChecked(false);
  };

  return (
    <View style={styles.root}>
      <LessonHeader progress={qi / questions.length} slow={slow} onToggleSlow={onToggleSlow} onClose={onClose} />
      <Text style={styles.title}>Piliin ang tamang larawan</Text>
      <Text style={styles.count}>
        Tanong {qi + 1} / {questions.length}
      </Text>

      <Stage talking={guide.speaking} listening={false} pose={pose}>
        <Text style={styles.kicker}>Alin ang larawan ng</Text>
        <Text style={styles.word} numberOfLines={1} adjustsFontSizeToFit>
          {question.answer.word.toUpperCase()}
        </Text>
        <SpeakerButton speaking={guide.speaking} onPress={() => guide.say(question.answer.word)} />
      </Stage>

      <View style={styles.grid}>
        {question.options.map((option) => {
          const isPicked = picked === option.emoji;
          const isAnswer = option.emoji === question.answer.emoji;
          const state = checked ? (isAnswer ? "right" : isPicked ? "wrong" : "idle") : isPicked ? "picked" : "idle";
          return (
            <Pressable
              key={option.emoji}
              disabled={checked}
              onPress={() => setPicked(option.emoji)}
              accessibilityRole="button"
              accessibilityLabel={`Larawan ng ${option.word}`}
              style={({ pressed }) => [
                styles.card,
                CARD[state],
                { borderBottomWidth: pressed && !checked ? 3 : 7, marginTop: pressed && !checked ? 4 : 0 },
              ]}
            >
              <Text style={styles.emoji}>{option.emoji}</Text>
            </Pressable>
          );
        })}
      </View>

      {!checked ? (
        <View style={styles.footer}>
          <Button3D label="Sigurado na" disabled={picked === null} onPress={check} />
        </View>
      ) : right ? (
        <FeedbackSheet
          good
          title={PRAISE[qi % PRAISE.length] ?? "Tama!"}
          line={`${question.answer.emoji} ${cap(question.answer.word)}`}
          primaryLabel={last ? "Tapusin" : "Susunod"}
          onPrimary={next}
        />
      ) : (
        <FeedbackSheet
          good={false}
          title="Hindi pa tama"
          line={`Ang tamang sagot: ${question.answer.emoji} ${cap(question.answer.word)}`}
          primaryLabel={last ? "Tapusin" : "Susunod"}
          onPrimary={next}
        />
      )}
    </View>
  );
}

const CARD = StyleSheet.create({
  idle: { backgroundColor: colors.white, borderColor: colors.line },
  picked: { backgroundColor: colors.infoBg, borderColor: colors.infoDark },
  right: { backgroundColor: colors.primaryBg, borderColor: colors.primary },
  wrong: { backgroundColor: colors.dangerBg, borderColor: colors.danger },
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  title: { fontFamily: font.display, fontSize: 28, color: colors.ink, textAlign: "center", marginTop: 6 },
  count: { fontFamily: font.bold, fontSize: 13, letterSpacing: 1.2, color: colors.muted, textAlign: "center", textTransform: "uppercase", marginBottom: 6 },
  kicker: { fontFamily: font.bold, fontSize: 13, letterSpacing: 1.2, color: colors.muted, textTransform: "uppercase" },
  word: { fontFamily: font.display, fontSize: 48, lineHeight: 54, color: colors.ink },
  grid: { flexDirection: "row", gap: 10, paddingHorizontal: 16, marginTop: 14 },
  card: { flex: 1, height: 128, borderWidth: 2, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  emoji: { fontSize: 58, lineHeight: 70 },
  footer: { position: "absolute", left: 20, right: 20, bottom: 32 },
});
