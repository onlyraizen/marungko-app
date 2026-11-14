import { Image } from "expo-image";
import { useEffect, useRef, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useT } from "../../i18n";
import { font } from "../../theme/fonts";
import { dark } from "../auth/dark";
import { PARENT_ICONS } from "../art/assets";
import Button3D from "../ui/Button3D";
import RoundSpeaker from "./RoundSpeaker";

/**
 * "Tama ito" for a parent: when the app did not understand the child (a noisy room, a soft voice) but the word was
 * said right, an adult holds a button for 3 seconds, then confirms. Design: Tama Ito 1 (hold gate) and 2 (confirm).
 * The hold keeps a young child from tapping it by accident; nothing is recorded or sent except the verdict.
 */
export const HOLD_MS = 3000;
const RING = 132;
const R = 60;
const CIRC = 2 * Math.PI * R;

type Props = {
  visible: boolean;
  /** The word as dotted syllables, e.g. "ba·ta". */
  dotted: string;
  onHear: () => void;
  onConfirm: () => void;
  onClose: () => void;
};

export default function ParentOverride({ visible, dotted, onHear, onConfirm, onClose }: Props) {
  const t = useT();
  const insets = useSafeAreaInsets();
  const [stage, setStage] = useState<"hold" | "confirm">("hold");
  const [progress, setProgress] = useState(0);
  const startedAt = useRef<number | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const clear = () => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    startedAt.current = null;
  };

  useEffect(() => {
    if (visible) {
      setStage("hold");
      setProgress(0);
    }
    return clear;
  }, [visible]);

  const press = () => {
    clear();
    startedAt.current = Date.now();
    timer.current = setInterval(() => {
      const spent = Date.now() - (startedAt.current ?? Date.now());
      if (spent >= HOLD_MS) {
        clear();
        setProgress(1);
        setStage("confirm");
      } else {
        setProgress(spent / HOLD_MS);
      }
    }, 40);
  };
  // Letting go early starts over: a held button is the whole point.
  const release = () => {
    if (timer.current === null) return;
    clear();
    setProgress(0);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.scrim}>
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 12) + 14 }]}>
          <View style={styles.grip} />
          {stage === "hold" ? (
            <>
              <Image source={PARENT_ICONS.lock} contentFit="contain" style={{ width: 64, height: 64 }} />
              <Text style={styles.title}>{t("parentOnly")}</Text>
              <Text style={styles.body}>{t("parentHold")}</Text>
              <View style={{ width: RING, height: RING, marginTop: 18 }}>
                <Svg width={RING} height={RING} viewBox={`0 0 ${RING} ${RING}`} style={StyleSheet.absoluteFill}>
                  <Circle cx={RING / 2} cy={RING / 2} r={R} fill="none" stroke="#D9EEF8" strokeWidth={10} />
                  <Circle
                    cx={RING / 2}
                    cy={RING / 2}
                    r={R}
                    fill="none"
                    stroke={dark.green}
                    strokeWidth={10}
                    strokeLinecap="round"
                    strokeDasharray={`${CIRC * progress} ${CIRC}`}
                    transform={`rotate(-90 ${RING / 2} ${RING / 2})`}
                  />
                </Svg>
                <Pressable
                  onPressIn={press}
                  onPressOut={release}
                  accessibilityRole="button"
                  accessibilityLabel={t("parentHold")}
                  style={styles.hold}
                >
                  <Text style={styles.hand}>{progress > 0 ? `${Math.ceil((1 - progress) * (HOLD_MS / 1000))}` : "☝"}</Text>
                </Pressable>
              </View>
              <Pressable onPress={onClose} style={styles.back} accessibilityRole="button">
                <Text style={styles.backText}>{t("parentBack")}</Text>
              </Pressable>
            </>
          ) : (
            <>
              <View style={styles.tag}>
                <Image source={PARENT_ICONS.lock} contentFit="contain" style={{ width: 20, height: 20 }} />
                <Text style={styles.tagText}>{t("parentTag")}</Text>
              </View>
              <Text style={styles.title}>{t("parentAsk")}</Text>
              <View style={styles.word}>
                <RoundSpeaker size={46} onPress={onHear} />
                <Text style={styles.wordText}>{dotted}</Text>
              </View>
              <View style={styles.buttons}>
                <Button3D label={t("parentYes")} onPress={onConfirm} />
                <Button3D label={t("parentNo")} tone="outlineDanger" onPress={onClose} />
              </View>
              <Text style={styles.note}>{t("parentNote")}</Text>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}


const styles = StyleSheet.create({
  scrim: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(58,34,16,0.55)" },
  sheet: { alignItems: "center", paddingTop: 34, paddingHorizontal: 22, backgroundColor: "#FFFFFF", borderTopWidth: 3, borderColor: dark.line, borderTopLeftRadius: 28, borderTopRightRadius: 28 },
  grip: { position: "absolute", top: 12, width: 60, height: 6, borderRadius: 3, backgroundColor: dark.line },
  title: { marginTop: 8, fontFamily: font.display, fontSize: 28, lineHeight: 40, textAlign: "center", color: dark.text, includeFontPadding: false },
  body: { marginTop: 4, fontFamily: font.bold, fontSize: 16, lineHeight: 22, textAlign: "center", color: dark.muted },
  hold: { position: "absolute", left: 18, top: 18, width: 96, height: 96, borderRadius: 48, alignItems: "center", justifyContent: "center", backgroundColor: "#5BC0F5", borderBottomWidth: 7, borderBottomColor: "#3A9ED4" },
  hand: { fontFamily: font.display, fontSize: 40, color: "#FFFFFF", includeFontPadding: false },
  back: { marginTop: 6, minHeight: 44, justifyContent: "center" },
  backText: { fontFamily: font.bold, fontSize: 14, letterSpacing: 1.4, color: dark.muted },
  tag: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 5, paddingLeft: 8, paddingRight: 14, borderRadius: 16, backgroundColor: "#E1F4FD", borderWidth: 2, borderColor: "#5BC0F5" },
  tagText: { fontFamily: font.bold, fontSize: 13, letterSpacing: 1.3, color: dark.blue },
  word: { marginTop: 14, flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 10, paddingLeft: 12, paddingRight: 22, borderWidth: 2, borderBottomWidth: 5, borderColor: dark.line, borderRadius: 22 },
  wordText: { fontFamily: font.display, fontSize: 44, lineHeight: 60, color: dark.text, includeFontPadding: false },
  buttons: { alignSelf: "stretch", marginTop: 16, gap: 10 },
  note: { marginTop: 12, fontFamily: font.bold, fontSize: 13, lineHeight: 18, textAlign: "center", color: dark.muted },
});
