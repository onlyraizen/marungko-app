import { Image } from "expo-image";
import { StyleSheet, View } from "react-native";
import { LOOPS, type Pose } from "../art/assets";
import { CapiLoop } from "../art/Capi";

type Props = {
  size: number;
  talking: boolean;
  listening: boolean;
  /** The still pose when Capi is neither talking nor listening. */
  pose: Pose;
  /**
   * Fraction of the width to leave out on the left. Every pose sits on a square canvas with Capi's body in the
   * middle and an empty strip on each side (the right strip holds a waving arm). Trimming the left strip makes
   * Capi and whatever stands beside him look centred on the screen.
   */
  trimLeft?: number;
};

/** Capi on his ground shadow: the talking loop while he speaks, the listening loop while he listens. */
export default function CapiActor({ size, talking, listening, pose, trimLeft = 0 }: Props) {
  return (
    <View style={{ width: size * (1 - trimLeft), height: size }}>
      <View style={{ position: "absolute", left: -size * trimLeft, top: 0, width: size, height: size }}>
      {/* Warm-up: decode both animations once, unseen, so Capi starts moving the moment he speaks. */}
      <Image source={LOOPS.talk} autoplay={false} style={styles.warm} />
      <Image source={LOOPS.listen} autoplay={false} style={styles.warm} />
      <View
        style={{
          position: "absolute",
          left: size * 0.18,
          top: size * 0.78,
          width: size * 0.64,
          height: size * 0.115,
          borderRadius: 100,
          backgroundColor: "rgba(60,100,130,0.16)",
        }}
      />
      <CapiLoop loop={listening ? "listen" : "talk"} playing={talking || listening} rest={pose} size={size} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({ warm: { position: "absolute", width: 1, height: 1, opacity: 0 } });
