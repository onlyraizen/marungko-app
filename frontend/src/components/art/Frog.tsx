import { Image } from "expo-image";
import { useEffect, useState } from "react";
import { Animated } from "react-native";
import { POND } from "./assets";
import { FROG_BOX } from "./pondGeometry";

type Props = {
  size?: number;
  /** 0 = sitting, 1 = legs out in mid-jump. Pass the hop's lift value to swap the picture. */
  air?: Animated.Value;
};

/** The frog. Sits and blinks now and then; shows the mid-jump picture while `air` is up. */
export default function Frog({ size = FROG_BOX, air }: Props) {
  const [blink, setBlink] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const next = () => {
      timer = setTimeout(() => {
        setBlink(true);
        timer = setTimeout(() => {
          setBlink(false);
          next();
        }, 140);
      }, 2200 + Math.random() * 2400);
    };
    next();
    return () => clearTimeout(timer);
  }, []);

  const box = { position: "absolute", left: 0, top: 0, width: size, height: size } as const;
  const sitOpacity = air ? air.interpolate({ inputRange: [0, 0.1, 1], outputRange: [1, 0, 0] }) : 1;
  const airOpacity = air ? air.interpolate({ inputRange: [0, 0.1, 1], outputRange: [0, 1, 1] }) : 0;

  return (
    <Animated.View style={{ width: size, height: size }}>
      <Animated.View style={[box, { opacity: sitOpacity }]}>
        <Image source={blink ? POND.frogBlink : POND.frogSit} style={{ width: size, height: size }} contentFit="contain" />
      </Animated.View>
      <Animated.View style={[box, { opacity: airOpacity }]}>
        <Image source={POND.frogAir} style={{ width: size, height: size }} contentFit="contain" />
      </Animated.View>
    </Animated.View>
  );
}
