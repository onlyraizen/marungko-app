import { useEffect, useRef } from "react";
import { Animated, Easing, Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { book } from "../../theme/book";
import CapybaraHead from "../art/CapybaraHead";
import { Bubbles, Ripples } from "../art/WaterFx";
import type { UnitState } from "./pages";

export const NODE_W = 150;
export const NODE_H = 156;
export const WATER_Y = 110;
export const HEAD_W = 120;
const CUT_OPEN = 78;
const CUT_LOCKED = 54;

/** Where the hero frog sits, relative to a node: on top of the capybara's head. */
export const FROG_W = 52;
export const FROG_H = 42;
export const FROG_DX = (NODE_W - FROG_W) / 2;
export const FROG_DY = WATER_Y - CUT_OPEN + 16 - FROG_H;

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
  /** Change this number to make the capybara shake its head (a locked lesson was tapped). */
  shakeKey: number;
  phase: number;
  onPress: () => void;
};

/** One lesson: a capybara in the pond. Locked ones are mostly under water, asleep. */
export default function CapyNode({ state, icon, stars, title, shakeKey, phase, onPress }: Props) {
  const locked = state === "locked";
  const cut = locked ? CUT_LOCKED : CUT_OPEN;
  const bob = useRef(new Animated.Value(0)).current;
  const shake = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    bob.setValue(0);
    const amount = locked ? 1.5 : 3;
    const duration = 1300 + phase * 150;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: -amount, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(bob, { toValue: 0, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [bob, locked, phase]);

  useEffect(() => {
    if (shakeKey === 0) return;
    Animated.sequence(
      [7, -7, 5, -5, 0].map((value) => Animated.timing(shake, { toValue: value, duration: 70, useNativeDriver: true })),
    ).start();
  }, [shakeKey, shake]);

  const mood = locked ? "sleep" : state === "done" ? "cheer" : "happy";

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
      {/* the capybara's body, seen through the water */}
      <View style={[styles.body, { opacity: locked ? 0.28 : 0.42 }]} />

      <Animated.View
        style={{
          position: "absolute",
          left: (NODE_W - HEAD_W) / 2,
          top: WATER_Y - cut,
          width: HEAD_W,
          height: cut,
          overflow: "hidden",
          transform: [{ translateX: shake }],
        }}
      >
        <Animated.View style={{ opacity: locked ? 0.8 : 1, transform: [{ translateY: bob }] }}>
          <CapybaraHead size={HEAD_W} mood={mood} />
        </Animated.View>
      </Animated.View>

      {/* the water line, and rings spreading from it */}
      <Svg width={NODE_W} height={14} viewBox="0 0 150 14" style={{ position: "absolute", left: 0, top: WATER_Y - 7 }}>
        <Path
          d="M6 7 Q18 1 30 7 T54 7 T78 7 T102 7 T126 7 T144 7"
          stroke="#FFFFFF"
          strokeWidth={3}
          strokeLinecap="round"
          fill="none"
          opacity={0.85}
        />
      </Svg>
      <View pointerEvents="none" style={{ position: "absolute", left: (NODE_W - 116) / 2, top: WATER_Y - 9 }}>
        <Ripples width={116} height={18} rings={2} />
      </View>

      {locked ? (
        <>
          <View style={{ position: "absolute", left: 6, top: WATER_Y - 44 }}>
            <Bubbles width={30} height={36} count={2} />
          </View>
          <View style={{ position: "absolute", right: 6, top: WATER_Y - 40 }}>
            <Bubbles width={30} height={32} count={2} />
          </View>
          <View style={styles.lockChip}>
            <Text style={styles.lockText}>🔒</Text>
          </View>
        </>
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
  body: {
    position: "absolute",
    left: 14,
    top: WATER_Y - 12,
    width: 122,
    height: 38,
    borderRadius: 19,
    backgroundColor: book.pondDeep,
  },
  lockChip: {
    position: "absolute",
    right: 22,
    top: WATER_Y - 62,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.92)",
    alignItems: "center",
    justifyContent: "center",
  },
  lockText: { fontSize: 14 },
  labelWrap: { position: "absolute", left: 0, right: 0, top: WATER_Y + 14, alignItems: "center" },
  label: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    maxWidth: NODE_W - 4,
    backgroundColor: "rgba(255,255,255,0.94)",
    borderRadius: 12,
    paddingLeft: 4,
    paddingRight: 9,
    paddingVertical: 3,
  },
  labelDim: { opacity: 0.8 },
  iconChip: {
    minWidth: 24,
    height: 22,
    borderRadius: 8,
    backgroundColor: book.paperShade,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  iconText: { fontSize: 12, fontWeight: "800", color: book.ink },
  labelText: { fontSize: 12, fontWeight: "800", color: book.ink, flexShrink: 1 },
  stars: { fontSize: 13, marginTop: 2 },
});
