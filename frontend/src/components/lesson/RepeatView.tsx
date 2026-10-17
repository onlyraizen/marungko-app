import type { ReactNode } from "react";
import { StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { colors } from "../../theme/colors";
import { font } from "../../theme/fonts";
import { syllabify } from "../../content/syllables";
import type { Pose } from "../art/assets";
import Bubble from "../ui/Bubble";
import MicButton, { type MicState } from "../ui/MicButton";
import TextLink from "../ui/TextLink";
import CapiActor from "./CapiActor";
import ExerciseFrame from "./ExerciseFrame";
import ListeningPill from "./ListeningPill";
import PictureCard from "./PictureCard";
import RoundSpeaker from "./RoundSpeaker";
import SlowLink from "./SlowLink";

type Props = {
  item: string;
  isSyllable: boolean;
  picture: { word: string; syllable: string | null } | null;
  progress: number;
  combo: number;
  yuzu: number;
  talking: boolean;
  listening: boolean;
  pose: Pose;
  /** How the last answer went; colours the word and hides the buttons. */
  verdict: "correct" | "almost" | "incorrect" | null;
  micState: MicState;
  micWaiting: boolean;
  slow: boolean;
  canSpeak: boolean;
  onToggleSlow: () => void;
  onSpeaker: () => void;
  onMic: () => void;
  onSkip: () => void;
  onClose: () => void;
  /** The feedback sheet, drawn over the bottom of the screen. */
  sheet: ReactNode;
};

/** The word in 56px Baloo with dots between the syllables. Long phrases shrink and wrap by word. */
function DottedWord({ text, color }: { text: string; color: string }) {
  const words = text.toLowerCase().split(/\s+/).filter(Boolean);
  const longest = Math.max(...words.map((word) => syllabify(word).join("·").length));
  const size = Math.max(26, Math.min(56, Math.floor(200 / (longest * 0.62))));
  return (
    <View style={styles.wordBox}>
      {words.map((word, w) => (
        <Text key={`${word}-${w}`} style={[styles.word, { fontSize: size, lineHeight: size * 1.45, color }]} numberOfLines={1}>
          {syllabify(word).map((part, i) => (
            <Text key={i}>
              {i > 0 ? <Text style={styles.dot}>·</Text> : null}
              {part}
            </Text>
          ))}
        </Text>
      ))}
    </View>
  );
}

/** "Ulitin pagkatapos ni Capi": Capi says the word, the child says it back. */
export default function RepeatView(props: Props) {
  const { width } = useWindowDimensions();
  const capiSize = Math.min(230, Math.max(170, width - 168));
  const color = props.verdict === "correct" ? colors.primaryInk : props.verdict === "almost" || props.verdict === "incorrect" ? colors.dangerDark : colors.ink;
  const answered = props.verdict !== null;
  const hint = props.isSyllable ? "Pindutin ang mikropono at sabihin ang pantig" : "Pindutin ang mikropono at sabihin ang salita";

  return (
    <ExerciseFrame
      title="Ulitin pagkatapos ni Capi"
      progress={props.progress}
      combo={props.combo}
      yuzu={props.yuzu}
      onClose={props.onClose}
    >
      <View style={styles.bubbleRow}>
        <Bubble tail="bottomLeft" style={styles.bubble}>
          <View style={styles.bubbleInner}>
            {!answered ? <RoundSpeaker disabled={props.listening || !props.canSpeak} onPress={props.onSpeaker} /> : null}
            <DottedWord text={props.item} color={color} />
          </View>
        </Bubble>
        <View style={styles.slow}>
          <SlowLink on={props.slow} onPress={props.onToggleSlow} />
        </View>
      </View>

      <View style={styles.stage}>
        <CapiActor size={capiSize} talking={props.talking} listening={props.listening} pose={props.pose} />
        {props.picture ? (
          <View style={styles.card}>
            <PictureCard word={props.picture.word} syllable={props.picture.syllable} size={84} />
          </View>
        ) : null}
      </View>

      {!answered ? (
        <View style={styles.micArea}>
          {props.listening ? <ListeningPill /> : <Text style={styles.hint}>{props.micState === "blocked" ? "Kailangan ang mikropono para makapagsalita" : hint}</Text>}
          <MicButton
            state={props.micState === "blocked" ? "blocked" : props.listening ? "live" : "ready"}
            waiting={props.micWaiting}
            onPress={props.onMic}
            label={props.listening ? "Itigil ang pagrekord" : "Magsalita"}
          />
          {props.listening ? (
            <Text style={styles.stop}>PINDUTIN ULIT PARA TUMIGIL</Text>
          ) : (
            <TextLink label="DI MAKAPAGSALITA NGAYON" onPress={props.onSkip} />
          )}
        </View>
      ) : (
        <View style={styles.micSpacer} />
      )}
      {props.sheet}
    </ExerciseFrame>
  );
}

const styles = StyleSheet.create({
  bubbleRow: { marginTop: 14, alignItems: "center" },
  bubble: { width: 290, minHeight: 100, borderRadius: 26, paddingVertical: 8, paddingHorizontal: 14, justifyContent: "center" },
  bubbleInner: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 14 },
  slow: { alignSelf: "flex-end", marginRight: 48, marginTop: 8 },
  wordBox: { alignItems: "center", flexShrink: 1 },
  word: { fontFamily: font.display, letterSpacing: 1, includeFontPadding: false, textAlign: "center" },
  dot: { color: "#3A9ED4" },
  stage: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 2, paddingHorizontal: 8 },
  card: { marginLeft: -6, marginTop: 30 },
  micArea: { alignItems: "center", gap: 8, paddingBottom: 14 },
  micSpacer: { height: 240 },
  hint: { fontFamily: font.body, fontSize: 16, color: "#3F6173", textAlign: "center", paddingHorizontal: 24 },
  stop: { fontFamily: font.bold, fontSize: 14, letterSpacing: 1.4, color: "#6B5A47", height: 44, textAlignVertical: "center", paddingTop: 14 },
});
