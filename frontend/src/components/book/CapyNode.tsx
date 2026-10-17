import { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "../../theme/colors";
import { font } from "../../theme/fonts";
import { book } from "../../theme/book";
import PondCapy from "../art/PondCapy";
import { FROG_BOX, FROG_DX, FROG_DY, NODE_H, NODE_W, WATER_BOTTOM } from "../art/pondGeometry";
import type { UnitState } from "./pages";

export { FROG_DX, FROG_DY, NODE_H, NODE_W };
export const FROG_W = FROG_BOX;
export const FROG_H = FROG_BOX;

const STATE_LABEL: Record<UnitState, string> = {
  done: "tapos na",
  current: "kasalukuyan",
  open: "bukas",
  locked: "naka-lock",
};

type Props = {
  state: UnitState;
  icon: string;
  stars: number;
  title: string;
  /** Change this number to make the capybara shake (a locked lesson was tapped). */
  shakeKey: number;
  phase: number;
  onPress: () => void;
};

/** One lesson: a submerged capybara in the pond. Locked ones sink lower, asleep and dim. */
export default function CapyNode({ state, icon, stars, title, shakeKey, phase, onPress }: Props) {
  const locked = state === "locked";
  const shake = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (shakeKey === 0) return;
    Animated.sequence([7, -7, 5, -5, 0].map((value) => Animated.timing(shake, { toValue: value, duration: 70, useNativeDriver: true }))).start();
  }, [shakeKey, shake]);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${STATE_LABEL[state]}`}
      style={({ pressed }) => ({
        width: NODE_W,
        height: NODE_H,
        opacity: pressed ? 0.92 : 1,
        transform: [{ scale: pressed ? 0.97 : 1 }],
      })}
    >
      <Animated.View style={{ transform: [{ translateX: shake }] }}>
        <PondCapy sleeping={locked} phase={phase} />
      </Animated.View>

      {locked ? (
        <View style={styles.lockChip}>
          <Text style={styles.lockText}>🔒</Text>
        </View>
      ) : null}
      {state === "current" ? (
        <View style={styles.startChip}>
          <Text style={styles.startText}>Ito na!</Text>
        </View>
      ) : null}

      <View style={styles.labelWrap}>
        <View style={[styles.label, locked && styles.labelDim]}>
          <View style={styles.iconChip}>
            <Text style={styles.iconText}>{icon}</Text>
          </View>
          <Text style={styles.labelText} numberOfLines={1}>
            {title}
          </Text>
        </View>
        {state === "done" ? <Text style={styles.stars}>{"⭐".repeat(Math.max(1, stars))}</Text> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  lockChip: {
    position: "absolute",
    right: 10,
    top: WATER_BOTTOM - 96,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(255,255,255,0.94)",
    alignItems: "center",
    justifyContent: "center",
  },
  lockText: { fontSize: 15 },
  startChip: {
    position: "absolute",
    right: 4,
    top: WATER_BOTTOM - 92,
    backgroundColor: colors.accent,
    borderRadius: 12,
    borderBottomWidth: 3,
    borderBottomColor: colors.accentDark,
    paddingHorizontal: 9,
    paddingVertical: 2,
  },
  startText: { fontFamily: font.bold, fontSize: 12, color: colors.ink },
  labelWrap: { position: "absolute", left: 0, right: 0, top: WATER_BOTTOM + 2, alignItems: "center" },
  label: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    maxWidth: NODE_W - 6,
    backgroundColor: "rgba(255,255,255,0.96)",
    borderRadius: 14,
    paddingLeft: 4,
    paddingRight: 10,
    paddingVertical: 3,
  },
  labelDim: { opacity: 0.8 },
  iconChip: {
    minWidth: 26,
    height: 24,
    borderRadius: 9,
    backgroundColor: book.paperShade,
    paddingHorizontal: 5,
    alignItems: "center",
    justifyContent: "center",
  },
  iconText: { fontFamily: font.bold, fontSize: 13, color: book.ink },
  labelText: { fontFamily: font.bold, fontSize: 13, color: book.ink, flexShrink: 1 },
  stars: { fontSize: 13, marginTop: 2 },
});
