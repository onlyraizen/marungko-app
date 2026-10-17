import { useEffect, useRef } from "react";
import { Animated, Easing, View } from "react-native";
import { book } from "../../theme/book";

/** A value that eases between 0 and 1 and back, forever. */
function useLoop(duration: number, delay = 0): Animated.Value {
  const value = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const run = Animated.sequence([
      Animated.delay(delay),
      Animated.loop(
        Animated.sequence([
          Animated.timing(value, { toValue: 1, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(value, { toValue: 0, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]),
      ),
    ]);
    run.start();
    return () => run.stop();
  }, [value, duration, delay]);
  return value;
}

function Pad({ left, top, size, delay, flower = false }: { left: number; top: number; size: number; delay: number; flower?: boolean }) {
  const bob = useLoop(1800, delay);
  return (
    <Animated.View
      style={{
        position: "absolute",
        left,
        top,
        width: size,
        height: size * 0.6,
        transform: [{ translateY: bob.interpolate({ inputRange: [0, 1], outputRange: [0, 3] }) }],
      }}
    >
      <View
        style={{
          flex: 1,
          borderRadius: size / 2,
          backgroundColor: book.pad,
          borderBottomWidth: 3,
          borderBottomColor: book.padDark,
        }}
      />
      <View
        style={{
          position: "absolute",
          left: size * 0.5,
          top: size * 0.2,
          width: size * 0.5,
          height: 3,
          backgroundColor: book.pond,
          transform: [{ rotate: "-12deg" }],
        }}
      />
      {flower ? (
        <View style={{ position: "absolute", left: size * 0.3, top: -size * 0.16, flexDirection: "row" }}>
          <View style={{ width: size * 0.16, height: size * 0.22, borderRadius: size * 0.1, backgroundColor: "#F7A8C4" }} />
          <View style={{ width: size * 0.18, height: size * 0.28, borderRadius: size * 0.1, backgroundColor: "#F48FB1", marginHorizontal: -2 }} />
          <View style={{ width: size * 0.16, height: size * 0.22, borderRadius: size * 0.1, backgroundColor: "#F7A8C4" }} />
        </View>
      ) : null}
    </Animated.View>
  );
}

function Reed({ left, bottom, h, delay }: { left: number; bottom: number; h: number; delay: number }) {
  const sway = useLoop(2200, delay);
  return (
    <Animated.View
      style={{
        position: "absolute",
        left,
        bottom,
        width: 10,
        height: h,
        alignItems: "center",
        transform: [
          { translateY: h / 2 },
          { rotate: sway.interpolate({ inputRange: [0, 1], outputRange: ["-4deg", "4deg"] }) },
          { translateY: -h / 2 },
        ],
      }}
    >
      <View style={{ width: 5, flex: 1, backgroundColor: book.reed, borderRadius: 3 }} />
      <View style={{ position: "absolute", top: 0, width: 10, height: 22, borderRadius: 5, backgroundColor: book.cattail }} />
    </Animated.View>
  );
}

function Sparkle({ left, top, delay }: { left: number; top: number; delay: number }) {
  const twinkle = useLoop(1100, delay);
  return (
    <Animated.View
      style={{
        position: "absolute",
        left,
        top,
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: "#FFFFFF",
        opacity: twinkle.interpolate({ inputRange: [0, 1], outputRange: [0.1, 0.9] }),
        transform: [{ scale: twinkle.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.3] }) }],
      }}
    />
  );
}

/** Living scenery for a pond page: lily pads, swaying reeds and twinkling water. */
export default function PondDecor({ width, height }: { width: number; height: number }) {
  return (
    <View pointerEvents="none" style={{ position: "absolute", left: 0, top: 0, width, height }}>
      <Pad left={width * 0.8} top={90} size={46} delay={0} flower />
      <Pad left={width * 0.05} top={height * 0.52} size={34} delay={500} />
      <Sparkle left={width * 0.52} top={104} delay={0} />
      <Sparkle left={width * 0.14} top={height * 0.3} delay={400} />
      <Sparkle left={width * 0.86} top={height * 0.55} delay={800} />
      <Sparkle left={width * 0.46} top={height - 70} delay={300} />
      <Reed left={30} bottom={22} h={74} delay={0} />
      <Reed left={46} bottom={18} h={56} delay={700} />
      <Reed left={width - 38} bottom={26} h={66} delay={400} />
    </View>
  );
}
