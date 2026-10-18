import { Image } from "expo-image";
import { useEffect, useRef, useState } from "react";
import { type LayoutChangeEvent, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { playSfx } from "../../hooks/useSfx";
import { font } from "../../theme/fonts";
import { MEDAL_ART, TRANSITIONS, type MedalId } from "../art/assets";
import { BOOKS } from "../book/books";
import Button3D from "../ui/Button3D";

// The still picture is 390 x 844 (drawn 'cover'). Everything else is placed in those coordinates.
const SCENE_WIDTH = 390;
const SCENE_HEIGHT = 844;
// The medal's ribbon tab hangs from the end of the ribbon at the top of the picture.
const MEDAL_SIZE = 190;
const MEDAL_LEFT = 100;
const MEDAL_TOP = 114;
const TAB_Y = 21; // where the tab starts inside the 190 x 190 medal picture

const CONFETTI_COLORS = ["#F7C531", "#E8553D", "#2FB8CC", "#F4A3B5", "#FFFFFF", "#6CCF6F"];
const CONFETTI = Array.from({ length: 26 }, (_, i) => ({
  x: 20 + ((i * 97) % 350),
  speed: 0.8 + ((i * 37) % 40) / 100,
  spin: ((i % 2 === 0 ? 1 : -1) * (360 + ((i * 53) % 540))),
  drift: ((i * 29) % 60) - 30,
  color: CONFETTI_COLORS[i % CONFETTI_COLORS.length] ?? "#FFFFFF",
  delay: (i * 23) % 260,
  wide: 6 + (i % 3) * 2,
}));
const SPARKLES = [
  { x: 70, y: 150, size: 30, delay: 0 },
  { x: 300, y: 130, size: 26, delay: 140 },
  { x: 110, y: 330, size: 22, delay: 260 },
  { x: 285, y: 320, size: 34, delay: 90 },
  { x: 195, y: 90, size: 20, delay: 330 },
];

type Props = { book: number; onDone: () => void };

/**
 * Shown once when a lesson finishes a whole book: Capi on his lily pad under the spotlights while the
 * book's own medal pops onto the ribbon and swings. The picture is one still image and the motion is
 * drawn here, so it stays smooth on any phone and the medal always stays attached to its ribbon.
 */
export default function BookCeremony({ book, onDone }: Props) {
  const window = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [size, setSize] = useState({ width: window.width, height: window.height });
  const info = BOOKS.find((entry) => entry.number === book);
  const medal = MEDAL_ART[`book${book}` as MedalId]?.on ?? MEDAL_ART.book1.on;

  const fade = useSharedValue(0);
  const pop = useSharedValue(0);
  const swing = useSharedValue(0);
  const fall = useSharedValue(0);
  const twinkle = useSharedValue(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const [showText, setShowText] = useState(false);
  const [showButton, setShowButton] = useState(false);

  useEffect(() => {
    const at = (ms: number, run: () => void) => timers.current.push(setTimeout(run, ms));
    fade.value = withTiming(1, { duration: 350 });
    pop.value = withDelay(650, withSpring(1, { damping: 9, stiffness: 150, mass: 0.8 }));
    swing.value = withDelay(
      650,
      withSequence(
        withTiming(0.22, { duration: 200, easing: Easing.out(Easing.quad) }),
        withTiming(-0.16, { duration: 380, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.09, { duration: 340, easing: Easing.inOut(Easing.sin) }),
        withTiming(-0.04, { duration: 300, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 260, easing: Easing.out(Easing.sin) }),
      ),
    );
    fall.value = withDelay(700, withTiming(1, { duration: 2600, easing: Easing.linear }));
    twinkle.value = withDelay(800, withTiming(1, { duration: 1200, easing: Easing.linear }));
    at(650, () => void playSfx("medal"));
    at(1800, () => void playSfx("finished"));
    at(1800, () => setShowText(true));
    at(2500, () => setShowButton(true));
    const pending = timers.current;
    return () => {
      for (const timer of pending) clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    if (width > 0 && height > 0) setSize({ width, height });
  };

  // The picture is drawn 'cover' on the screen; the medal layer uses the same scale and offset.
  const fit = Math.max(size.width / SCENE_WIDTH, size.height / SCENE_HEIGHT);
  const offsetX = (size.width - SCENE_WIDTH * fit) / 2;
  const offsetY = (size.height - SCENE_HEIGHT * fit) / 2;

  const fadeStyle = useAnimatedStyle(() => ({ opacity: fade.value }));
  const medalStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, pop.value * 3),
    transform: [{ translateY: (1 - pop.value) * -26 * fit }, { rotate: `${swing.value}rad` }, { scale: Math.max(0, pop.value) }],
  }));

  return (
    <View style={styles.root} onLayout={onLayout}>
      <Animated.View style={[styles.fill, fadeStyle]}>
        <Image source={TRANSITIONS.ceremonyEnd} contentFit="cover" style={styles.fill} />
      </Animated.View>

      <View
        pointerEvents="none"
        style={[styles.scene, { left: offsetX, top: offsetY, width: SCENE_WIDTH * fit, height: SCENE_HEIGHT * fit }]}
      >
        <Animated.View
          style={[
            styles.medal,
            {
              left: MEDAL_LEFT * fit,
              top: MEDAL_TOP * fit,
              width: MEDAL_SIZE * fit,
              height: MEDAL_SIZE * fit,
              transformOrigin: `${(MEDAL_SIZE / 2) * fit}px ${TAB_Y * fit}px`,
            },
            medalStyle,
          ]}
        >
          <Image
            source={medal}
            contentFit="contain"
            style={{ width: MEDAL_SIZE * fit, height: MEDAL_SIZE * fit }}
            accessibilityLabel={`Medalya ng Libro ${book}`}
          />
        </Animated.View>
        {SPARKLES.map((sparkle, index) => (
          <Sparkle key={index} progress={twinkle} k={fit} {...sparkle} />
        ))}
        {CONFETTI.map((piece, index) => (
          <Confetti key={index} progress={fall} k={fit} {...piece} />
        ))}
      </View>

      <View style={[styles.bottom, { paddingBottom: Math.max(insets.bottom, 12) + 14 }]}>
        {showText ? (
          <View style={styles.texts}>
            <Text style={styles.title}>Natapos mo ang Book {book}!</Text>
            {info ? <Text style={styles.subtitle}>{info.subtitle}</Text> : null}
          </View>
        ) : null}
        {showButton ? <Button3D label="Tuloy" onPress={onDone} /> : <View style={styles.buttonSpace} />}
      </View>
    </View>
  );
}

function Confetti({
  progress,
  k,
  x,
  speed,
  spin,
  drift,
  color,
  delay,
  wide,
}: {
  progress: { value: number };
  k: number;
  x: number;
  speed: number;
  spin: number;
  drift: number;
  color: string;
  delay: number;
  wide: number;
}) {
  const style = useAnimatedStyle(() => {
    const t = Math.min(1, Math.max(0, (progress.value * 2600 - delay) / 2300));
    return {
      opacity: t <= 0 ? 0 : t > 0.88 ? (1 - t) / 0.12 : 1,
      transform: [
        { translateX: drift * t * k },
        { translateY: (-30 + t * speed * 900) * k },
        { rotate: `${spin * t}deg` },
      ],
    };
  });
  return <Animated.View style={[styles.confetti, { left: x * k, width: wide * k, height: 12 * k, backgroundColor: color }, style]} />;
}

function Sparkle({ progress, k, x, y, size, delay }: { progress: { value: number }; k: number; x: number; y: number; size: number; delay: number }) {
  const style = useAnimatedStyle(() => {
    const t = Math.min(1, Math.max(0, (progress.value * 1200 - delay) / 700));
    const pulse = Math.sin(t * Math.PI);
    return { opacity: pulse, transform: [{ scale: 0.4 + pulse * 0.9 }, { rotate: `${t * 90}deg` }] };
  });
  return (
    <Animated.Text style={[styles.sparkle, { left: x * k, top: y * k, fontSize: size * k, lineHeight: (size + 6) * k }, style]}>✦</Animated.Text>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#2F3A78" },
  fill: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  scene: { position: "absolute" },
  medal: { position: "absolute" },
  confetti: { position: "absolute", top: 0, borderRadius: 2 },
  sparkle: { position: "absolute", color: "#FFE08A", includeFontPadding: false },
  bottom: { position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 20, gap: 12 },
  texts: { alignItems: "center", gap: 0 },
  title: {
    fontFamily: font.display,
    fontSize: 30,
    lineHeight: 42,
    color: "#FFFFFF",
    textAlign: "center",
    includeFontPadding: false,
    textShadowColor: "rgba(10,60,100,0.6)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 0,
  },
  subtitle: {
    fontFamily: font.bold,
    fontSize: 16,
    color: "#FFFFFF",
    textAlign: "center",
    textShadowColor: "rgba(10,60,100,0.6)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 0,
  },
  buttonSpace: { height: 56 },
});
