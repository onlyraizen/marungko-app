import { Image } from "expo-image";
import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { LOOPS, type Pose } from "../art/assets";
import { CapiLoop, Ground } from "../art/Capi";
import Bubble from "../ui/Bubble";

type Props = {
  talking: boolean;
  listening: boolean;
  /** The still pose when Capi is neither talking nor listening. */
  pose: Pose;
  children: ReactNode;
};

/** Capi on his ground shadow, with his dialogue bubble beside him. */
export default function Stage({ talking, listening, pose, children }: Props) {
  return (
    <View style={styles.row}>
      {/* Warm-up: decode both animations once, unseen, so Capi starts moving the moment he speaks. */}
      <Image source={LOOPS.talk} autoplay={false} style={styles.warm} />
      <Image source={LOOPS.listen} autoplay={false} style={styles.warm} />
      <View style={styles.capi}>
        <CapiLoop loop={listening ? "listen" : "talk"} playing={talking || listening} rest={pose} size={200} />
        <Ground width={130} style={styles.ground} />
      </View>
      <Bubble tail="left" style={styles.bubble}>
        {children}
      </Bubble>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "flex-end", paddingHorizontal: 12, gap: 14 },
  capi: { width: 184, alignItems: "center" },
  warm: { position: "absolute", width: 1, height: 1, opacity: 0 },
  ground: { marginTop: -20 },
  bubble: { flex: 1, marginBottom: 46, minHeight: 130, justifyContent: "center" },
});
