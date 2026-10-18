import { Image } from "expo-image";
import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View, useWindowDimensions } from "react-native";
import Animated, { Easing, interpolate, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  CEREMONY_FPS,
  CEREMONY_FRAMES,
  MEDAL_ROTATION,
  MEDAL_SCALE,
  MEDAL_X,
  MEDAL_Y,
} from "../../content/ceremonyMedal";
import { playSfx } from "../../hooks/useSfx";
import { colors } from "../../theme/colors";
import { font } from "../../theme/fonts";
import { MEDAL_ART, TRANSITIONS, type MedalId } from "../art/assets";
import { BOOKS } from "../book/books";
import Button3D from "../ui/Button3D";

const FRAME_NUMBERS = Array.from({ length: CEREMONY_FRAMES }, (_, i) => i);
const SCENE_WIDTH = 390;
const SCENE_HEIGHT = 844;
const LENGTH_MS = ((CEREMONY_FRAMES - 1) / CEREMONY_FPS) * 1000;

type Props = { book: number; onDone: () => void };

/**
 * Shown once when a lesson finishes a whole book: Capi on his lily pad under the spotlights while the
 * book's own medal swings down on its ribbon. The background is a 5 s animation; the medal is drawn on
 * top from the same keyframes, so one animation serves all six books.
 */
export default function BookCeremony({ book, onDone }: Props) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const info = BOOKS.find((entry) => entry.number === book);
  const medal = MEDAL_ART[`book${book}` as MedalId]?.on ?? MEDAL_ART.book1.on;

  const frame = useSharedValue(0);
  const started = useRef(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const [ended, setEnded] = useState(false);
  const [showText, setShowText] = useState(false);
  const [showButton, setShowButton] = useState(false);

  const start = () => {
    if (started.current) return;
    started.current = true;
    frame.value = 0;
    frame.value = withTiming(CEREMONY_FRAMES - 1, { duration: LENGTH_MS, easing: Easing.linear });
    const at = (ms: number, run: () => void) => timers.current.push(setTimeout(run, ms));
    at(1100, () => void playSfx("medal"));
    at(2400, () => void playSfx("finished"));
    at(2600, () => setShowText(true));
    at(3300, () => setShowButton(true));
    // Hold on the last frame in case the animation file loops.
    at(LENGTH_MS + 150, () => setEnded(true));
  };

  // If the animation file is slow to load, start the medal anyway.
  useEffect(() => {
    const fallback = setTimeout(start, 1200);
    timers.current.push(fallback);
    return () => {
      for (const timer of timers.current) clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The scene is drawn 'cover' on the screen; the medal layer uses the same scale and offset.
  const scale = Math.max(width / SCENE_WIDTH, height / SCENE_HEIGHT);
  const offsetX = (width - SCENE_WIDTH * scale) / 2;
  const offsetY = (height - SCENE_HEIGHT * scale) / 2;

  const medalStyle = useAnimatedStyle(() => {
    const f = frame.value;
    return {
      transform: [
        { translateX: interpolate(f, FRAME_NUMBERS, MEDAL_X) },
        { translateY: interpolate(f, FRAME_NUMBERS, MEDAL_Y) },
        { rotate: `${interpolate(f, FRAME_NUMBERS, MEDAL_ROTATION)}rad` },
        { scale: interpolate(f, FRAME_NUMBERS, MEDAL_SCALE) },
      ],
    };
  });

  return (
    <View style={styles.root}>
      <Image source={TRANSITIONS.ceremony} autoplay priority="high" contentFit="cover" style={StyleSheet.absoluteFill} onLoad={start} onError={start} />
      {ended ? <Image source={TRANSITIONS.ceremonyEnd} contentFit="cover" style={StyleSheet.absoluteFill} /> : null}

      <View pointerEvents="none" style={[styles.scene, { left: offsetX, top: offsetY, transform: [{ scale }] }]}>
        <Animated.View style={[styles.medal, medalStyle]}>
          <Image source={medal} contentFit="contain" style={styles.medalImage} accessibilityLabel={`Medalya ng Libro ${book}`} />
        </Animated.View>
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

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.primary },
  scene: { position: "absolute", width: SCENE_WIDTH, height: SCENE_HEIGHT, transformOrigin: "0 0" },
  medal: { position: "absolute", left: 0, top: 0, width: 190, height: 190, transformOrigin: "0 0" },
  medalImage: { width: 190, height: 190 },
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
