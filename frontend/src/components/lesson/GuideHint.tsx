import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Animated, Easing, Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { G, Path } from "react-native-svg";
import { colors } from "../../theme/colors";
import { font } from "../../theme/fonts";

/**
 * "Pindutin ito": a pulsing coral ring and a bouncing yellow arrow around the speaker button.
 * Drawn from guide-pulse-ring-animated.svg and guide-arrow-bounce-*-animated.svg in the design canvas
 * (same shapes, colours and timing), as native views so nothing has to decode an animated image.
 */

const ARROW_PATH = "M50 10 L84 46 H64 V86 H36 V46 H16 Z";
const BOUNCE_MS = 1167;
const RING_MS = 1633;
/** The design draws the ring in a 120-unit box around a 46 px speaker. */
const RING_BOX_PER_SPEAKER = 120 / 46;

type Direction = "up" | "right";

type Dir = Direction | "down" | "left";
const ROTATION: Record<Dir, number> = { up: 0, right: 90, down: 180, left: 270 };

export function GuideArrow({ size, direction }: { size: number; direction: Dir }) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const ease = Easing.bezier(0.4, 0, 0.6, 1);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(t, { toValue: 1, duration: BOUNCE_MS / 2, easing: ease, useNativeDriver: true }),
        Animated.timing(t, { toValue: 0, duration: BOUNCE_MS / 2, easing: ease, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [t]);

  const k = size / 120;
  // The design moves the arrow between two positions (in the 120-unit box), always toward the thing it points at.
  const move = (from: number, to: number) => t.interpolate({ inputRange: [0, 1], outputRange: [from * k, to * k] });
  const translateX = direction === "right" ? move(4, 13) : direction === "left" ? move(13, 4) : 10 * k;
  const translateY = direction === "up" ? move(14, 5) : direction === "down" ? move(5, 14) : 8 * k;
  const rotate = `rotate(${ROTATION[direction]} 50 50)`;

  return (
    <Animated.View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ width: size, height: size, transform: [{ translateX }, { translateY }] }}
    >
      <Svg width={size} height={size} viewBox="0 0 120 120">
        <G transform="translate(0 3)">
          <Path d={ARROW_PATH} transform={rotate} fill="#FFFFFF" stroke="#FFFFFF" strokeWidth={18} strokeLinejoin="round" />
        </G>
        <G transform="translate(0 6)">
          <Path d={ARROW_PATH} transform={rotate} fill="#C98A12" stroke="#C98A12" strokeWidth={9} strokeLinejoin="round" />
        </G>
        <Path d={ARROW_PATH} transform={rotate} fill={colors.accent} stroke={colors.accent} strokeWidth={9} strokeLinejoin="round" />
        <Path d="M44 30 L50 23 L56 30" transform={rotate} fill="none" stroke="#FFE98A" strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    </Animated.View>
  );
}

function Ring({ box, startAt }: { box: number; startAt: number }) {
  const p = useRef(new Animated.Value(startAt)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.timing(p, { toValue: 1, duration: RING_MS, easing: Easing.linear, useNativeDriver: false }), { iterations: -1, resetBeforeIteration: true });
    // The second ring starts half a cycle in, so the two are always apart.
    const first = Animated.timing(p, { toValue: 1, duration: RING_MS * (1 - startAt), easing: Easing.linear, useNativeDriver: false });
    first.start(({ finished }) => {
      if (finished) loop.start();
    });
    return () => {
      first.stop();
      loop.stop();
    };
  }, [p, startAt]);

  const k = box / 120;
  const diameter = p.interpolate({ inputRange: [0, 1], outputRange: [52 * k, 112 * k] });
  const offset = p.interpolate({ inputRange: [0, 1], outputRange: [(60 - 26) * k, (60 - 56) * k] });
  return (
    <Animated.View
      style={{
        position: "absolute",
        left: offset,
        top: offset,
        width: diameter,
        height: diameter,
        borderRadius: box,
        borderColor: colors.danger,
        borderWidth: p.interpolate({ inputRange: [0, 1], outputRange: [6 * k, 3 * k] }),
        opacity: p.interpolate({ inputRange: [0, 1], outputRange: [0.85, 0] }),
      }}
    />
  );
}

/** The two rings, centred on the speaker (a box 2.6 times its size). */
export function PulseRing({ speakerSize }: { speakerSize: number }) {
  const box = speakerSize * RING_BOX_PER_SPEAKER;
  return (
    <View pointerEvents="none" style={{ position: "absolute", left: (speakerSize - box) / 2, top: (speakerSize - box) / 2, width: box, height: box }}>
      <Ring box={box} startAt={0} />
      <Ring box={box} startAt={0.5} />
    </View>
  );
}


const PILL_H = 36;

/**
 * Wraps one element and, while `show` is true, draws the first-time guide around it: an arrow that bounces toward it,
 * a pulse ring (round buttons), and a large "Sige" button. Tapping the element itself also dismisses it: the caller
 * does that by calling `onDismiss` from the element's onPress, so a child can never be stuck behind the guide.
 */
export function GuideTarget({
  direction,
  show,
  onDismiss,
  okLabel,
  width,
  height,
  ring = false,
  arrowSize,
  children,
}: {
  direction: Dir;
  show: boolean;
  onDismiss: () => void;
  okLabel: string;
  width: number;
  height: number;
  ring?: boolean;
  arrowSize?: number;
  children: ReactNode;
}) {
  const arrow = arrowSize ?? Math.round(Math.min(Math.max(width, height) * 1.2, 64));
  const gap = ring ? Math.round(Math.min(width, height) * 0.55) : 6;
  const centerX = (width - arrow) / 2;
  const centerY = (height - arrow) / 2;
  let arrowPos = { left: centerX, top: height + 2 };
  let pillPos: { left?: number; right?: number; top: number } = { left: width / 2 - 36, top: height + 2 + arrow };
  if (direction === "down") {
    arrowPos = { left: centerX, top: -arrow - 2 };
    pillPos = { left: width / 2 - 36, top: -arrow - 2 - PILL_H - 4 };
  } else if (direction === "right") {
    arrowPos = { left: -arrow - gap, top: centerY };
    pillPos = { left: -arrow - gap - 4, top: centerY + arrow };
  } else if (direction === "left") {
    arrowPos = { left: width + gap, top: centerY };
    pillPos = { left: width + gap, top: centerY + arrow };
  }
  return (
    <View style={{ width, height }}>
      {show && ring ? <PulseRing speakerSize={Math.min(width, height)} /> : null}
      {children}
      {show ? (
        <>
          <View pointerEvents="none" style={[{ position: "absolute" }, arrowPos]}>
            <GuideArrow size={arrow} direction={direction} />
          </View>
          <Pressable
            onPress={onDismiss}
            accessibilityRole="button"
            accessibilityLabel={okLabel}
            hitSlop={8}
            style={[styles.pill, pillPos]}
          >
            <Text style={styles.pillText}>{okLabel}</Text>
          </Pressable>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    position: "absolute",
    minWidth: 72,
    height: PILL_H,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
    backgroundColor: colors.accent,
    borderBottomWidth: 4,
    borderBottomColor: colors.accentDark,
  },
  pillText: { fontFamily: font.bold, fontSize: 14, letterSpacing: 1.4, color: colors.ink },
});
