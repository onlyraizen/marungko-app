import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Animated, Easing, View } from "react-native";
import Svg, { G, Path } from "react-native-svg";
import { colors } from "../../theme/colors";

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

export function GuideArrow({ size, direction }: { size: number; direction: Direction }) {
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
  // The design moves the arrow between two positions (in the 120-unit box): up 14 -> 5, right 4 -> 13.
  const translate =
    direction === "up"
      ? { translateX: 10 * k, translateY: t.interpolate({ inputRange: [0, 1], outputRange: [14 * k, 5 * k] }) }
      : { translateX: t.interpolate({ inputRange: [0, 1], outputRange: [4 * k, 13 * k] }), translateY: 8 * k };
  const rotate = direction === "up" ? "rotate(0 50 50)" : "rotate(90 50 50)";

  return (
    <Animated.View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ width: size, height: size, transform: [{ translateX: translate.translateX }, { translateY: translate.translateY }] }}
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

// Shown until the child has tapped a speaker once in this session; after that it would only nag.
let speakerTapped = false;

/** `show` is true until the first tap on a speaker; call `used()` from the speaker's onPress. */
export function useSpeakerHint() {
  const [show, setShow] = useState(!speakerTapped);
  const used = useCallback(() => {
    speakerTapped = true;
    setShow(false);
  }, []);
  return { show, used };
}

/**
 * Wraps a speaker button of `size` and draws the hint around it. "up": the arrow sits under the button
 * (the quiz). "right": the arrow sits to the left and points at it (repeat after Capi).
 */
export function SpeakerWithHint({ size, direction, show, children }: { size: number; direction: Direction; show: boolean; children: ReactNode }) {
  const arrow = direction === "up" ? Math.round(size * 1.39) : size;
  return (
    <View style={{ width: size, height: size }}>
      {show ? <PulseRing speakerSize={size} /> : null}
      {children}
      {show ? (
        <View
          pointerEvents="none"
          style={
            direction === "up"
              ? { position: "absolute", top: size + 2, left: (size - arrow) / 2 }
              : { position: "absolute", top: -2, left: -Math.round(size * 0.55) - arrow }
          }
        >
          <GuideArrow size={arrow} direction={direction} />
        </View>
      ) : null}
    </View>
  );
}

