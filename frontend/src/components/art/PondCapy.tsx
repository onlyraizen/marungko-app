import { Image } from "expo-image";
import { useEffect, useRef, useState } from "react";
import { Animated, Easing, View } from "react-native";
import { POND } from "./assets";
import { LAYER_LEFT, LAYER_TOP, NODE_W, S, WATER_BOTTOM } from "./pondGeometry";

type Props = {
  /** A sleeping capybara sinks lower, stays still and looks dim. */
  sleeping?: boolean;
  /** Changes how often and in what order he looks around, so a row of capybaras isn't in step. */
  phase?: number;
};

const LOOK = [POND.capyFront, POND.capyLeft, POND.capyFront, POND.capyRight] as const;
const layer = { position: "absolute", left: LAYER_LEFT, top: LAYER_TOP, width: S, height: S } as const;

/**
 * A capybara in the water, built from four layers: ripple ring, capybara, water band.
 * He looks left and right on his own, bobs, and the ring and water drift, all live.
 */
export default function PondCapy({ sleeping = false, phase = 0 }: Props) {
  const [look, setLook] = useState(0);
  const bob = useRef(new Animated.Value(0)).current;
  const ring = useRef(new Animated.Value(0)).current;
  const sway = useRef(new Animated.Value(0)).current;

  // Look around: front, left, front, right, at a slightly different pace for each capybara.
  useEffect(() => {
    if (sleeping) {
      setLook(0);
      return;
    }
    let step = phase % LOOK.length;
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      step = (step + 1) % LOOK.length;
      setLook(step);
      timer = setTimeout(tick, 1100 + ((phase * 370 + step * 290) % 900));
    };
    timer = setTimeout(tick, 600 + phase * 400);
    return () => clearTimeout(timer);
  }, [sleeping, phase]);

  useEffect(() => {
    const sine = Easing.inOut(Easing.sin);
    const bobAmount = sleeping ? 1.5 : 3.5;
    const loops = [
      Animated.loop(
        Animated.sequence([
          Animated.timing(bob, { toValue: -bobAmount, duration: 1300 + phase * 140, easing: sine, useNativeDriver: true }),
          Animated.timing(bob, { toValue: 0, duration: 1300 + phase * 140, easing: sine, useNativeDriver: true }),
        ]),
      ),
      Animated.loop(
        Animated.sequence([
          Animated.timing(ring, { toValue: 1, duration: 1700 + phase * 120, easing: sine, useNativeDriver: true }),
          Animated.timing(ring, { toValue: 0, duration: 1700 + phase * 120, easing: sine, useNativeDriver: true }),
        ]),
      ),
      Animated.loop(
        Animated.sequence([
          Animated.timing(sway, { toValue: 1, duration: 2100 + phase * 90, easing: sine, useNativeDriver: true }),
          Animated.timing(sway, { toValue: 0, duration: 2100 + phase * 90, easing: sine, useNativeDriver: true }),
        ]),
      ),
    ];
    loops.forEach((loop) => loop.start());
    return () => loops.forEach((loop) => loop.stop());
  }, [bob, ring, sway, sleeping, phase]);

  const sink = sleeping ? 0.05 * S : 0;

  return (
    <View style={{ width: NODE_W, height: WATER_BOTTOM, overflow: "hidden" }}>
      <Animated.View
        style={[
          layer,
          { opacity: ring.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] }), transform: [{ scale: ring.interpolate({ inputRange: [0, 1], outputRange: [0.97, 1.05] }) }] },
        ]}
      >
        <Image source={POND.waterBack} style={{ width: S, height: S }} contentFit="contain" />
      </Animated.View>

      <Animated.View style={[layer, { opacity: sleeping ? 0.62 : 1, transform: [{ translateY: Animated.add(bob, sink) }] }]}>
        {LOOK.map((source, i) => (
          // Three looks are stacked and only the current one is visible, so swapping never flickers.
          <Image
            key={i}
            source={source}
            style={{ position: "absolute", width: S, height: S, opacity: i === look ? 1 : 0 }}
            contentFit="contain"
          />
        ))}
      </Animated.View>

      <Animated.View
        style={[layer, { transform: [{ translateX: sway.interpolate({ inputRange: [0, 1], outputRange: [-3, 3] }) }] }]}
      >
        <Image source={POND.waterFront} style={{ width: S, height: S }} contentFit="contain" />
      </Animated.View>
    </View>
  );
}
