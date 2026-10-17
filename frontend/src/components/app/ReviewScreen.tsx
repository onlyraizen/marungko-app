import { Image } from "expo-image";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { colors } from "../../theme/colors";
import { font } from "../../theme/fonts";
import { Capi, Ground } from "../art/Capi";
import { ICONS } from "../art/assets";
import PictureCard from "../lesson/PictureCard";
import Bubble from "../ui/Bubble";
import Button3D from "../ui/Button3D";
import ScreenHeader from "./ScreenHeader";

type Props = {
  /** Words the child missed and has not yet got right. */
  words: readonly string[];
  onStart: () => void;
  onSettings: () => void;
};

/** "Balik-aral": a short round of the words the child missed, so they can try them again. */
export default function ReviewScreen({ words, onStart, onSettings }: Props) {
  const count = words.length;
  const shown = words.slice(0, 6);
  return (
    <View style={styles.root}>
      <ScreenHeader title="Balik-aral" onSettings={onSettings} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View>
            <Capi pose={count > 0 ? "thinking" : "cheer"} size={150} />
            <Ground width={100} style={styles.ground} />
          </View>
          <Bubble tail="left" style={styles.bubble}>
            <Text style={styles.bubbleText}>
              {count > 0 ? `May ${count} salita tayong babalikan!` : "Wala pang babalikan. Tapusin muna ang isang aralin!"}
            </Text>
          </Bubble>
        </View>

        {count > 0 ? (
          <View style={styles.cards}>
            {shown.map((word) => (
              <PictureCard key={word} word={word} size={64} />
            ))}
          </View>
        ) : null}
        {count > shown.length ? <Text style={styles.more}>at {count - shown.length} pa</Text> : null}

        <View style={styles.button}>
          <ReviewButton enabled={count > 0} onPress={onStart} />
        </View>
      </ScrollView>
    </View>
  );
}

/** The coral "BALIK-ARAL" button with its loop icon, or the grey "WALA PANG ARALIN" one. */
export function ReviewButton({ enabled, onPress }: { enabled: boolean; onPress: () => void }) {
  return (
    <View style={{ opacity: 1 }}>
      <Button3D
        label={enabled ? "Balik-aral" : "Wala pang aralin"}
        tone={enabled ? "danger" : "locked"}
        disabled={!enabled}
        onPress={onPress}
        style={enabled ? styles.withIcon : styles.withIcon}
      />
      <View pointerEvents="none" style={styles.iconWrap}>
        <Image source={ICONS.review} contentFit="contain" style={[styles.icon, !enabled && { opacity: 0.5 }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, gap: 16 },
  hero: { flexDirection: "row", alignItems: "center", gap: 8 },
  ground: { marginTop: -14, alignSelf: "center" },
  bubble: { flex: 1, marginLeft: 6 },
  bubbleText: { fontFamily: font.display, fontSize: 20, lineHeight: 30, color: colors.ink },
  cards: { flexDirection: "row", flexWrap: "wrap", gap: 12, justifyContent: "center" },
  more: { fontFamily: font.bold, fontSize: 15, color: colors.muted, textAlign: "center" },
  button: { marginTop: 8 },
  withIcon: { paddingLeft: 48 },
  iconWrap: { position: "absolute", left: 24, top: 0, bottom: 6, justifyContent: "center" },
  icon: { width: 32, height: 32 },
});
