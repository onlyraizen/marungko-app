import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { explain } from "../../content/quiz";
import { colors } from "../../theme/colors";
import { font } from "../../theme/fonts";
import { CapiPeek } from "../art/Capi";
import Button3D from "../ui/Button3D";
import { BackIcon, ThumbIcon } from "../ui/Icons";
import Tile from "../ui/Tile";
import { exampleFor } from "./pictures";

type Props = {
  word: string;
  onBack: () => void;
  onContinue: () => void;
  /** Called when the child taps a thumb, so the answer can be saved with the note. */
  onRate?: (note: "nakatulong" | "hindi nakatulong") => void;
};

const Blue = ({ children }: { children: string }) => <Text style={styles.blue}>{children}</Text>;

/** "Ipaliwanag ang sagot ko": the word taken apart syllable by syllable, with an example for each sound. */
export default function ExplainScreen({ word, onBack, onContinue, onRate }: Props) {
  const insets = useSafeAreaInsets();
  const info = explain(word, (syllable, exclude) => exampleFor(syllable, exclude)?.word ?? null);
  const [picked, setPicked] = useState(0);
  const [rated, setRated] = useState<"up" | "down" | null>(null);
  const joined = info.parts.join("-");

  return (
    <View style={[styles.root, { paddingTop: insets.top + 6 }]}>
      <View style={styles.header}>
        <Pressable onPress={onBack} style={styles.back} accessibilityRole="button" accessibilityLabel="Bumalik">
          <BackIcon />
        </Pressable>
        <Text style={styles.heading}>Ipaliwanag ang sagot ko</Text>
        <View style={styles.back} />
      </View>

      <View style={styles.tilesRow}>
        <View style={styles.tiles}>
          {info.parts.map((part, i) => (
            <Tile key={`${part}-${i}`} label={part} state={i === picked ? "picked" : "normal"} onPress={() => setPicked(i)} />
          ))}
        </View>
        <View style={styles.peek}>
          <CapiPeek peek="excited" width={124} />
        </View>
      </View>

      <View style={styles.card}>
        <ScrollView contentContainerStyle={styles.cardBody} showsVerticalScrollIndicator={false}>
          <Text style={styles.text}>
            {info.parts.map((part, i) => (
              <Text key={i}>
                {i > 0 ? " + " : ""}
                <Text style={styles.big}>{part}</Text>
              </Text>
            ))}
            {" = "}
            <Text style={[styles.big, { color: colors.ink }]}>{word.toLowerCase()}</Text>
          </Text>
          {info.lines.map((line) => (
            <Text key={line.syllable} style={styles.text}>
              {"Ang "}
              <Blue>{line.syllable}</Blue>
              {` ay may tunog na /${line.syllable}/`}
              {line.example ? (
                <>
                  {" gaya ng "}
                  <Text style={styles.strong}>{line.example}</Text>
                </>
              ) : null}
              {"."}
            </Text>
          ))}
          <Text style={styles.text}>
            {"Kapag pinagsama, "}
            <Blue>{joined}</Blue>
            {" ay "}
            <Text style={styles.strong}>{word.toLowerCase()}</Text>
            {info.meaning ? `, ang ${info.meaning}.` : "."}
          </Text>
        </ScrollView>
        <View style={styles.thumbs}>
          <Pressable
            onPress={() => {
              setRated("down");
              onRate?.("hindi nakatulong");
            }}
            style={styles.thumb}
            accessibilityRole="button"
            accessibilityLabel="Hindi nakatulong"
          >
            <ThumbIcon down filled={rated === "down"} color={rated === "down" ? colors.danger : "#8A7B66"} />
          </Pressable>
          <Pressable
            onPress={() => {
              setRated("up");
              onRate?.("nakatulong");
            }}
            style={styles.thumb}
            accessibilityRole="button"
            accessibilityLabel="Nakatulong"
          >
            <ThumbIcon filled={rated === "up"} color={rated === "up" ? colors.primaryDark : "#8A7B66"} />
          </Pressable>
        </View>
      </View>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) + 8 }]}>
        <Button3D label="Ituloy ang aralin" tone="info" onPress={onContinue} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0, backgroundColor: colors.bg, zIndex: 60, elevation: 60 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 8 },
  back: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  heading: { fontFamily: font.display, fontSize: 24, lineHeight: 34, color: colors.ink, includeFontPadding: false },
  tilesRow: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", paddingLeft: 20, paddingRight: 22, marginTop: 16, minHeight: 100 },
  tiles: { flexDirection: "row", flexWrap: "wrap", gap: 10, flex: 1, paddingBottom: 4, paddingRight: 8 },
  peek: { marginBottom: -2 },
  card: {
    flex: 1,
    marginHorizontal: 16,
    marginTop: 0,
    backgroundColor: colors.white,
    borderWidth: 2,
    borderBottomWidth: 6,
    borderColor: colors.border,
    borderRadius: 26,
    paddingTop: 22,
    paddingHorizontal: 22,
    paddingBottom: 6,
  },
  cardBody: { gap: 16, paddingBottom: 8 },
  text: { fontFamily: font.body, fontSize: 20, lineHeight: 30, color: colors.ink },
  big: { fontFamily: font.display, fontSize: 32, lineHeight: 44, color: colors.infoInk },
  blue: { fontFamily: font.display, color: colors.infoInk },
  strong: { fontFamily: font.bold },
  thumbs: { flexDirection: "row", justifyContent: "flex-end", gap: 6 },
  thumb: { width: 48, height: 48, alignItems: "center", justifyContent: "center" },
  footer: { paddingHorizontal: 20, paddingTop: 14 },
});
