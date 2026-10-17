import { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "../../theme/colors";
import { font } from "../../theme/fonts";
import { CapiPeek } from "../art/Capi";
import { LockIcon, StarIcon } from "../ui/Icons";
import { LOCKED_LOOK, type BookView } from "./books";

type Props = { view: BookView; index: number; shakeKey: number; onPress: () => void };

/**
 * One book on the shelf, built from the UI pack's book card: a bubble and Capi's reaction over the top,
 * the cover with its spine, ribbon and badge, and the page edge showing underneath.
 */
export default function BookCard({ view, index, shakeKey, onPress }: Props) {
  const locked = view.status === "locked";
  const soon = view.status === "soon";
  const look = locked ? LOCKED_LOOK : view.look;
  const shake = useRef(new Animated.Value(0)).current;
  const bob = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (shakeKey === 0) return;
    Animated.sequence([8, -8, 6, -6, 0].map((v) => Animated.timing(shake, { toValue: v, duration: 60, useNativeDriver: true }))).start();
  }, [shakeKey, shake]);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: -4, duration: 900 + index * 140, useNativeDriver: true }),
        Animated.timing(bob, { toValue: 0, duration: 900 + index * 140, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [bob, index]);

  const percent = view.totalUnits > 0 ? view.doneUnits / view.totalUnits : 0;
  const label = `${view.title}, ${view.subtitle}, ${
    soon ? "malapit na" : locked ? "naka-lock" : `${view.doneUnits} sa ${view.totalUnits} aralin tapos na`
  }`;

  return (
    <Animated.View style={[styles.wrap, { transform: [{ translateX: shake }] }]}>
      <Animated.View pointerEvents="none" style={[styles.peek, { transform: [{ translateY: bob }] }]}>
        <CapiPeek peek={view.peek} width={170} />
      </Animated.View>

      <View style={styles.bubble}>
        <Text style={styles.bubbleText}>{view.say}</Text>
        <View style={styles.tail} />
      </View>

      <View style={styles.bookArea}>
        <View style={styles.edge} />
        <Pressable
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel={label}
          style={({ pressed }) => [
            styles.cover,
            { backgroundColor: look.face, borderBottomColor: look.lip, borderBottomWidth: pressed ? 3 : 8, marginTop: pressed ? 5 : 0 },
          ]}
        >
          <View style={[styles.spine, { backgroundColor: look.lip }]}>
            <View style={styles.stitch} />
          </View>
          <View style={styles.body}>
            <View>
              <Text style={styles.title}>{view.title}</Text>
              <Text style={styles.subtitle} numberOfLines={1}>
                {view.subtitle}
              </Text>
            </View>
            {view.status === "done" ? (
              <View style={styles.row}>
                <StarIcon />
                <StarIcon />
                <StarIcon />
                <Text style={[styles.small, { marginLeft: 8, letterSpacing: 1.2 }]}>TAPOS NA</Text>
              </View>
            ) : soon ? (
              <View style={styles.soonChip}>
                <Text style={styles.small}>MALAPIT NA</Text>
              </View>
            ) : locked ? (
              <Text style={styles.small} numberOfLines={1}>
                Tapusin muna ang Book {view.number - 1}
              </Text>
            ) : (
              <View style={styles.row}>
                <View style={styles.track}>
                  <View style={[styles.fill, { width: `${Math.round(percent * 100)}%` }]} />
                </View>
                <Text style={styles.small}>
                  {view.doneUnits} / {view.totalUnits} aralin
                </Text>
              </View>
            )}
          </View>
          <View style={[styles.badge, locked && styles.badgeLocked]}>
            {locked ? <LockIcon /> : <Text style={[styles.badgeText, { color: look.lip }]}>{view.badge}</Text>}
          </View>
        </Pressable>
        {!locked && !soon ? (
          <View pointerEvents="none" style={styles.ribbon}>
            <View style={styles.notch} />
          </View>
        ) : null}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { height: 268, marginBottom: 6 },
  peek: { position: "absolute", right: -6, top: 0, zIndex: 0 },
  bubble: {
    position: "absolute",
    left: 0,
    top: 6,
    width: 190,
    paddingTop: 12,
    paddingBottom: 10,
    paddingHorizontal: 16,
    backgroundColor: colors.white,
    borderWidth: 2,
    borderBottomWidth: 5,
    borderColor: colors.border,
    borderRadius: 20,
    zIndex: 2,
  },
  bubbleText: { fontFamily: font.display, fontSize: 26, lineHeight: 34, color: colors.ink, includeFontPadding: false },
  tail: {
    position: "absolute",
    right: -9,
    top: 34,
    width: 14,
    height: 14,
    backgroundColor: colors.white,
    borderTopWidth: 2,
    borderRightWidth: 2,
    borderColor: colors.border,
    transform: [{ rotate: "45deg" }],
  },
  bookArea: { position: "absolute", left: 0, right: 0, top: 122, height: 140, zIndex: 1 },
  edge: {
    position: "absolute",
    left: 12,
    right: -6,
    top: 10,
    bottom: -10,
    backgroundColor: "#FFF6E0",
    borderBottomWidth: 6,
    borderBottomColor: "#E8D5A8",
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
    borderTopRightRadius: 18,
    borderBottomRightRadius: 18,
  },
  cover: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    flexDirection: "row",
    overflow: "hidden",
    borderTopLeftRadius: 10,
    borderBottomLeftRadius: 10,
    borderTopRightRadius: 22,
    borderBottomRightRadius: 22,
  },
  spine: { width: 28 },
  stitch: { position: "absolute", right: 7, top: 12, bottom: 12, borderRightWidth: 3, borderStyle: "dashed", borderColor: "rgba(255,255,255,0.4)" },
  body: { flex: 1, paddingTop: 12, paddingBottom: 12, paddingLeft: 18, paddingRight: 96, justifyContent: "space-between" },
  title: { fontFamily: font.display, fontSize: 40, lineHeight: 52, color: "#FFFFFF", includeFontPadding: false },
  subtitle: { fontFamily: font.body, fontSize: 19, lineHeight: 24, color: "#FFFFFF", marginTop: -2 },
  row: { flexDirection: "row", alignItems: "center", gap: 6 },
  track: { width: 96, height: 14, borderRadius: 7, backgroundColor: "rgba(0,0,0,0.28)", overflow: "hidden" },
  fill: { height: "100%", borderRadius: 7, backgroundColor: colors.accent },
  small: { fontFamily: font.bold, fontSize: 14, letterSpacing: 0.6, color: "#FFFFFF" },
  soonChip: { alignSelf: "flex-start", backgroundColor: "rgba(0,0,0,0.22)", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 4 },
  badge: {
    position: "absolute",
    right: 18,
    top: 16,
    width: 68,
    height: 68,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  badgeLocked: { backgroundColor: "rgba(255,255,255,0.25)" },
  badgeText: { fontFamily: font.display, fontSize: 38, lineHeight: 52, includeFontPadding: false },
  ribbon: { position: "absolute", right: 52, top: -3, width: 20, height: 31, backgroundColor: colors.accent },
  notch: {
    position: "absolute",
    bottom: -9,
    left: 0,
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderTopWidth: 9,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: colors.accent,
  },
});
