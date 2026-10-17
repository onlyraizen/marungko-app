import { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "../../theme/colors";
import { font } from "../../theme/fonts";
import type { Peek } from "../art/assets";
import { CapiPeek } from "../art/Capi";
import Bubble from "../ui/Bubble";
import type { BookView } from "./books";

type Props = { view: BookView; index: number; shakeKey: number; onPress: () => void };

const PEEK: Record<BookView["status"], Peek> = { done: "cheer", current: "excited", open: "curious", locked: "sleepy" };
const SAY: Record<BookView["status"], string> = {
  done: "Galing mo!",
  current: "Tara, magbasa!",
  open: "Subukan natin!",
  locked: "Zzz...",
};

/** One book on the shelf: a real-looking cover with a spine and ribbon, and Capi peeking over the top. */
export default function BookCard({ view, index, shakeKey, onPress }: Props) {
  const locked = view.status === "locked";
  const shake = useRef(new Animated.Value(0)).current;
  const bob = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (shakeKey === 0) return;
    Animated.sequence([8, -8, 6, -6, 0].map((v) => Animated.timing(shake, { toValue: v, duration: 60, useNativeDriver: true }))).start();
  }, [shakeKey, shake]);

  useEffect(() => {
    if (locked) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: -4, duration: 900 + index * 120, useNativeDriver: true }),
        Animated.timing(bob, { toValue: 0, duration: 900 + index * 120, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [locked, bob, index]);

  const face = locked ? colors.grey : index % 2 === 0 ? colors.teal : colors.redBook;
  const lip = locked ? "#5E7079" : index % 2 === 0 ? colors.tealDark : colors.dangerDark;
  const spine = locked ? "#6A7D86" : index % 2 === 0 ? "#167585" : "#B8402D";
  const percent = view.totalUnits > 0 ? view.doneUnits / view.totalUnits : 0;

  return (
    <Animated.View style={[styles.wrap, { transform: [{ translateX: shake }] }]}>
      <Animated.View pointerEvents="none" style={[styles.peek, { transform: [{ translateY: bob }] }]}>
        <CapiPeek peek={PEEK[view.status]} width={128} />
      </Animated.View>
      <Bubble tail="none" style={styles.bubble}>
        <Text style={styles.bubbleText}>{SAY[view.status]}</Text>
      </Bubble>

      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${view.title}, ${view.subtitle}, ${locked ? "naka-lock" : `${view.doneUnits} sa ${view.totalUnits} aralin tapos na`}`}
        style={({ pressed }) => [
          styles.cover,
          { backgroundColor: face, borderBottomColor: lip, borderBottomWidth: pressed ? 3 : 9, marginTop: pressed ? 6 : 0 },
        ]}
      >
        <View style={[styles.spine, { backgroundColor: spine }]} />
        <View style={styles.ribbon}>
          <View style={styles.notch} />
        </View>
        <View style={styles.body}>
          <Text style={styles.title}>{view.title}</Text>
          <Text style={styles.subtitle}>{view.subtitle}</Text>
          <View style={styles.chipRow}>
            {locked ? (
              <View style={styles.chip}>
                <Text style={styles.chipText}>🔒 Tapusin muna ang nakaraang libro</Text>
              </View>
            ) : (
              <>
                <View style={styles.track}>
                  <View style={[styles.fill, { width: `${Math.round(percent * 100)}%` }]} />
                </View>
                <Text style={styles.count}>
                  {view.doneUnits}/{view.totalUnits}
                </Text>
              </>
            )}
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 66 },
  peek: { position: "absolute", right: 16, top: -66, zIndex: 0 },
  bubble: { position: "absolute", right: 150, top: -44, paddingVertical: 6, paddingHorizontal: 12, zIndex: 2 },
  bubbleText: { fontFamily: font.bold, fontSize: 14, color: colors.ink },
  cover: {
    zIndex: 1,
    height: 132,
    flexDirection: "row",
    overflow: "hidden",
    borderTopLeftRadius: 10,
    borderBottomLeftRadius: 10,
    borderTopRightRadius: 24,
    borderBottomRightRadius: 24,
  },
  spine: { width: 24 },
  ribbon: { position: "absolute", left: 40, top: 0, width: 18, height: 40, backgroundColor: colors.accent },
  notch: {
    position: "absolute",
    bottom: -9,
    left: 0,
    width: 0,
    height: 0,
    borderLeftWidth: 9,
    borderRightWidth: 9,
    borderTopWidth: 9,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: colors.accent,
  },
  body: { flex: 1, paddingLeft: 38, paddingRight: 14, justifyContent: "center", gap: 2 },
  title: { fontFamily: font.display, fontSize: 36, lineHeight: 42, color: "#FFFFFF" },
  subtitle: { fontFamily: font.bold, fontSize: 16, color: "rgba(255,255,255,0.92)" },
  chipRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 8 },
  track: { flex: 1, height: 12, borderRadius: 6, backgroundColor: "rgba(0,0,0,0.22)", overflow: "hidden", maxWidth: 150 },
  fill: { height: "100%", borderRadius: 6, backgroundColor: colors.accent },
  count: { fontFamily: font.bold, fontSize: 15, color: "#FFFFFF" },
  chip: { backgroundColor: "rgba(0,0,0,0.2)", borderRadius: 12, paddingHorizontal: 10, paddingVertical: 5 },
  chipText: { fontFamily: font.bold, fontSize: 12, color: "#FFFFFF" },
});
