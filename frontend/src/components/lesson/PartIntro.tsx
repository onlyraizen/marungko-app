import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { LessonPart } from "../../content/parts";
import { syllabify } from "../../content/syllables";
import { useT, type StringKey } from "../../i18n";
import { font } from "../../theme/fonts";
import { Capi } from "../art/Capi";
import { dark, DarkPage } from "../auth/dark";
import Button3D from "../ui/Button3D";
import { CloseIcon } from "../ui/Icons";
import { useCoach, type CoachVoice } from "../../guides/coach";
import RoundSpeaker from "./RoundSpeaker";
import { GuideTarget } from "./GuideHint";

type Props = {
  part: LessonPart;
  /** Which part this is (1 to total) and how many there are. */
  number: number;
  total: number;
  /** Plays the example word (the speaker button). Leave out to hide the button. */
  onHear?: (item: string) => void;
  onStart: () => void;
  onClose: () => void;
  coachVoice?: CoachVoice;
};

const CLAPS: Record<LessonPart["count"], StringKey> = { 1: "partClap1", 2: "partClap2", 3: "partClap3", 4: "partClap4" };
const POSE = { 1: "pointUp", 2: "pointRight", 3: "wave", 4: "wave" } as const;
const MAX_TILES = 4;

/** One example word for the card: the part's first item that is a single word, else the first word of its first item. */
function exampleOf(part: LessonPart): { word: string; pieces: string[] } {
  const single = part.items.find((item) => !/\s/.test(item.trim())) ?? part.items[0] ?? "";
  const word = single.trim().split(/\s+/)[0] ?? "";
  return { word, pieces: syllabify(word.toLowerCase()).slice(0, MAX_TILES) };
}

/**
 * Shown before each part of a lesson ("Dalawang pantig"). Design: Part Intro 1-3 (BAHAGI chip, example tiles,
 * one clap dot per syllable, Capi, SIMULAN, a dot per part at the top).
 */
export default function PartIntro({ part, number, total, onHear, onStart, onClose, coachVoice }: Props) {
  const t = useT();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const coach = useCoach(["lesson_intro"], coachVoice);
  const [capiRoom, setCapiRoom] = useState(200);
  const { word, pieces } = exampleOf(part);
  const tile = pieces.length > 3 ? 64 : 78;
  const tileFont = pieces.length > 3 ? 38 : 48;

  const confirmClose = () =>
    Alert.alert("Aalis ka na ba?", "Hindi mase-save ang progreso ng araling ito.", [
      { text: "Magpatuloy", style: "cancel" },
      { text: "Umalis", style: "destructive", onPress: onClose },
    ]);

  return (
    <DarkPage scene="tall" style={{ paddingTop: insets.top + 6, paddingHorizontal: 16 }}>
      <View style={styles.header}>
        <Pressable onPress={confirmClose} style={styles.close} accessibilityRole="button" accessibilityLabel="Isara ang aralin">
          <CloseIcon />
        </Pressable>
        <View style={styles.dots} accessibilityLabel={t("partWord", { n: number, total })}>
          {Array.from({ length: total }, (_, i) => (
            <View key={i} style={[styles.dot, i + 1 === number && styles.dotOn]} />
          ))}
        </View>
        <View style={styles.close} />
      </View>

      <View style={styles.chip}>
        <Text style={styles.chipText}>{t("partChip", { n: number })}</Text>
      </View>
      <Text style={styles.title}>{t(part.title)}</Text>
      <Text style={styles.sub}>{t(CLAPS[part.count])}</Text>

      <View style={styles.card}>
        <View style={styles.tiles}>
          {pieces.map((piece, i) => (
            <View key={`${piece}-${i}`} style={[styles.tile, { minWidth: tile, height: tile + 6 }]}>
              <Text style={[styles.tileText, { fontSize: tileFont }]}>{piece}</Text>
            </View>
          ))}
        </View>
        <View style={[styles.claps, { gap: pieces.length > 2 ? 44 : 26 }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {pieces.map((_, i) => (
            <View key={i} style={styles.clap} />
          ))}
        </View>
        {onHear && word !== "" ? (
          <View style={styles.hear}>
            <RoundSpeaker size={46} onPress={() => onHear(word)} />
            <Text style={styles.hearText}>{t("listenLabel").toUpperCase()}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.capiBox} onLayout={(e) => setCapiRoom(e.nativeEvent.layout.height)}>
        <Capi pose={POSE[part.count]} size={Math.max(110, Math.min(230, capiRoom, width - 120))} />
      </View>

      <View style={{ paddingBottom: Math.max(insets.bottom, 12) + 6 }}>
        <GuideTarget
          direction="down"
          show={coach.current === "lesson_intro"}
          onDismiss={() => coach.done("lesson_intro")}
          okLabel={t("guideOk")}
          width={width - 32}
          height={62}
        >
          <Button3D
            label={t("partStart")}
            onPress={() => {
              coach.done("lesson_intro");
              onStart();
            }}
          />
        </GuideTarget>
      </View>
    </DarkPage>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", marginLeft: -8 },
  close: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  dots: { flex: 1, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: "rgba(255,255,255,0.95)" },
  dotOn: { width: 30, backgroundColor: dark.green },
  chip: { alignSelf: "center", marginTop: 10, paddingHorizontal: 18, paddingVertical: 6, borderRadius: 16, backgroundColor: "#F7C531", borderBottomWidth: 4, borderBottomColor: "#C98A12" },
  chipText: { fontFamily: font.bold, fontSize: 14, letterSpacing: 1.7, color: "#5A3A00" },
  title: { fontFamily: font.display, fontSize: 36, lineHeight: 50, textAlign: "center", color: dark.text, includeFontPadding: false },
  sub: { fontFamily: font.bold, fontSize: 17, textAlign: "center", color: "#3F6173" },
  card: { marginTop: 14, paddingTop: 20, paddingBottom: 16, paddingHorizontal: 12, alignItems: "center", gap: 14, backgroundColor: dark.field, borderWidth: 2, borderColor: dark.line, borderBottomWidth: 6, borderRadius: 26 },
  tiles: { flexDirection: "row", alignItems: "center", gap: 8 },
  tile: { paddingHorizontal: 14, alignItems: "center", justifyContent: "center", borderWidth: 2, borderBottomWidth: 6, borderColor: "#5BC0F5", borderRadius: 20, backgroundColor: "#E1F4FD" },
  tileText: { fontFamily: font.display, color: dark.blue, includeFontPadding: false },
  claps: { flexDirection: "row", alignItems: "center" },
  clap: { width: 18, height: 18, borderRadius: 9, backgroundColor: "#F7C531", borderBottomWidth: 3, borderBottomColor: "#C98A12" },
  hear: { flexDirection: "row", alignItems: "center", gap: 10 },
  hearText: { fontFamily: font.bold, fontSize: 15, letterSpacing: 1.5, color: dark.blue },
  capiBox: { flex: 1, alignItems: "center", justifyContent: "flex-end", paddingBottom: 6 },
});
