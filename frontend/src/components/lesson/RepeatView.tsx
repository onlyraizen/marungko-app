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

/** The compact bubble from the design: a blue speaker button beside the word, the bubble hugging both. */
const SPEAKER_SIZE = 40;
const SPEAKER_GAP = 10;
const BUBBLE_PADDING = 12;
const MAX_WORD_SIZE = 40;
/** Capi's canvas has an empty strip on the left (body starts at 19.6%); keep a little of it. */
const CAPI_TRIM = 0.18;

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

/** The word in 40px Baloo with dots between the syllables. Long phrases shrink and wrap by word. */
function DottedWord({ text, color, room }: { text: string; color: string; room: number }) {
  const words = text.toLowerCase().split(/\s+/).filter(Boolean);
  const longest = Math.max(...words.map((word) => syllabify(word).join("·").length));
  const size = Math.max(22, Math.min(MAX_WORD_SIZE, Math.floor(room / (longest * 0.62))));
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
  // The bubble hugs its content (speaker + word), centred on the screen, never wider than the screen minus margins.
  const maxBubble = Math.min(320, width - 48);
  const room = maxBubble - BUBBLE_PADDING * 2 - 4 - SPEAKER_SIZE - SPEAKER_GAP;
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
        <View style={{ maxWidth: maxBubble }}>
          <Bubble tail="bottomLeft" style={styles.bubble}>
            <View style={styles.bubbleInner}>
              {!answered ? (
                <RoundSpeaker size={SPEAKER_SIZE} disabled={props.listening || !props.canSpeak} onPress={props.onSpeaker} />
              ) : null}
              <DottedWord text={props.item} color={color} room={room} />
            </View>
          </Bubble>
          <View style={styles.slow}>
            <SlowLink on={props.slow} onPress={props.onToggleSlow} />
          </View>
        </View>
      </View>

      <View style={styles.stage}>
        <CapiActor size={capiSize} trimLeft={CAPI_TRIM} talking={props.talking} listening={props.listening} pose={props.pose} />
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
  bubble: { minWidth: 190, borderRadius: 22, paddingVertical: 6, paddingHorizontal: BUBBLE_PADDING },
  bubbleInner: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: SPEAKER_GAP },
  slow: { alignItems: "flex-end", marginTop: 6 },
  wordBox: { alignItems: "center", flexShrink: 1 },
  word: { fontFamily: font.display, letterSpacing: 1, includeFontPadding: false, textAlign: "center" },
  dot: { color: "#3A9ED4" },
  // Sits a little above the middle of the free space, so there is no empty band under the bubble.
  stage: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 2, paddingHorizontal: 8, paddingBottom: 104 },
  card: { marginLeft: -6, marginTop: 30 },
  micArea: { alignItems: "center", gap: 8, paddingBottom: 14 },
  micSpacer: { height: 240 },
  hint: { fontFamily: font.body, fontSize: 16, color: "#3F6173", textAlign: "center", paddingHorizontal: 24 },
  stop: { fontFamily: font.bold, fontSize: 14, letterSpacing: 1.4, color: "#6B5A47", height: 44, textAlignVertical: "center", paddingTop: 14 },
});
