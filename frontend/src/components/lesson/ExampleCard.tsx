import { StyleSheet, Text, View } from "react-native";
import { colors } from "../../theme/colors";
import { font } from "../../theme/fonts";
import type { Picture } from "./pictures";

type Props = {
  /** The syllable being practised, when this is a syllable ("sa"); null for a whole word. */
  syllable: string | null;
  picture: Picture;
};

const cap = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** The picture under Capi's bubble: "SA para sa SAGING" with a banana, or a house for BAHAY. */
export default function ExampleCard({ syllable, picture }: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.pic}>
        <Text style={styles.emoji}>{picture.emoji}</Text>
      </View>
      <View style={styles.text}>
        <Text style={styles.kicker}>{syllable ? "Halimbawa" : "Larawan"}</Text>
        {syllable ? (
          <Text style={styles.line} numberOfLines={2}>
            <Text style={styles.hl}>{syllable.toUpperCase()}</Text>
            {" para sa "}
            <Text style={styles.hl}>{picture.word.toUpperCase()}</Text>
          </Text>
        ) : (
          <Text style={styles.line} numberOfLines={2}>
            {cap(picture.word)}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: colors.white,
    borderWidth: 2,
    borderBottomWidth: 5,
    borderColor: colors.border,
    borderRadius: 22,
    padding: 12,
  },
  pic: { width: 76, height: 76, borderRadius: 18, backgroundColor: colors.infoBg, alignItems: "center", justifyContent: "center" },
  emoji: { fontSize: 46, lineHeight: 56 },
  text: { flex: 1, gap: 2 },
  kicker: { fontFamily: font.bold, fontSize: 12, letterSpacing: 1.4, color: colors.muted, textTransform: "uppercase" },
  line: { fontFamily: font.body, fontSize: 22, lineHeight: 30, color: colors.ink },
  hl: { fontFamily: font.display, color: colors.infoInk },
});
