import type { Unit } from "@marungko/shared";
import { useEffect, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import { font } from "../../theme/fonts";
import { book } from "../../theme/book";
import Frog from "../art/Frog";
import CapyNode, { FROG_DX, FROG_DY, FROG_H, FROG_W, NODE_H, NODE_W } from "./CapyNode";
import PondDecor from "./PondDecor";
import { iconFor, starsFor, type BookPageData, type UnitState } from "./pages";

type Props = {
  page: BookPageData;
  states: ReadonlyMap<string, UnitState>;
  progress: ReadonlyMap<string, { best_correct: number; total: number }>;
  width: number;
  height: number;
  unlockAll: boolean;
  /** The lesson the frog last sat on, remembered between visits. */
  petUnitId: string | undefined;
  /** A static copy used while a page is turning: no hopping, no arrival. */
  still?: boolean;
  onPetSettled?: (unitId: string) => void;
  /** Called once the frog has landed on a tapped lesson. */
  onSelect?: (unit: Unit) => void;
  onLocked?: (unit: Unit) => void;
};

const HEADER_BOTTOM = 66;
const ARC = 64;

/** One page of the book: a pond of capybaras (the lessons) and a frog that hops between them. */
export default function BookPage({
  page,
  states,
  progress,
  width,
  height,
  unlockAll,
  petUnitId,
  still = false,
  onPetSettled,
  onSelect,
  onLocked,
}: Props) {
  const n = page.units.length;
  const firstTop = 84;
  const lastTopLimit = height - NODE_H - 22;
  const spacing = n > 1 ? Math.min(158, Math.max(84, (lastTopLimit - firstTop) / (n - 1))) : 0;
  const topOf = (i: number): number =>
    n === 1
      ? Math.min(Math.max(height * 0.42 - NODE_H / 2, firstTop), Math.max(firstTop, lastTopLimit))
      : firstTop + i * spacing;
  const cxOf = (i: number): number => (n === 1 ? width / 2 : width * (i % 2 === 0 ? 0.29 : 0.71));
  const frogAt = (i: number) => ({ x: cxOf(i) - NODE_W / 2 + FROG_DX, y: topOf(i) + FROG_DY });

  const doneCount = page.units.filter((unit) => states.get(unit.id) === "done").length;
  const firstUnfinished = page.units.findIndex((unit) => states.get(unit.id) !== "done");
  const savedIdx = page.units.findIndex((unit) => unit.id === petUnitId);
  const targetIdx = unlockAll && savedIdx >= 0 ? savedIdx : firstUnfinished >= 0 ? firstUnfinished : n - 1;

  // The frog starts where it last sat and hops to where it should be now.
  const [startIdx] = useState(() => (!still && savedIdx >= 0 ? savedIdx : targetIdx));
  const start = frogAt(startIdx);
  const tx = useRef(new Animated.Value(start.x)).current;
  const ty = useRef(new Animated.Value(start.y)).current;
  const lift = useRef(new Animated.Value(0)).current;
  const squash = useRef(new Animated.Value(0)).current;
  const tilt = useRef(new Animated.Value(0)).current;
  const dir = useRef(new Animated.Value(1)).current;
  const breath = useRef(new Animated.Value(1)).current;
  const arrive = useRef(new Animated.Value(still || savedIdx >= 0 ? 1 : 0)).current;

  const atRef = useRef(startIdx);
  const busy = useRef(false);
  const alive = useRef(true);
  const [shake, setShake] = useState<{ id: string; n: number }>({ id: "", n: 0 });

  useEffect(
    () => () => {
      alive.current = false;
    },
    [],
  );

  useEffect(() => {
    if (still) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breath, { toValue: 1.05, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(breath, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [breath, still]);

  const hopTo = (idx: number, done?: () => void) => {
    if (busy.current) return;
    if (idx === atRef.current) {
      done?.();
      return;
    }
    busy.current = true;
    const to = frogAt(idx);
    dir.setValue(to.x >= frogAt(atRef.current).x ? 1 : -1);
    Animated.sequence([
      // crouch
      Animated.timing(squash, { toValue: 1, duration: 140, useNativeDriver: true }),
      // leap in an arc, stretched and tilted
      Animated.parallel([
        Animated.timing(tx, { toValue: to.x, duration: 720, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(ty, { toValue: to.y, duration: 720, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.sequence([
          Animated.timing(lift, { toValue: 1, duration: 360, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.timing(lift, { toValue: 0, duration: 360, easing: Easing.in(Easing.quad), useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(tilt, { toValue: 1, duration: 360, useNativeDriver: true }),
          Animated.timing(tilt, { toValue: 0, duration: 360, useNativeDriver: true }),
        ]),
        Animated.timing(squash, { toValue: -1, duration: 160, useNativeDriver: true }),
      ]),
      // land with a squash, then settle
      Animated.timing(squash, { toValue: 1, duration: 90, useNativeDriver: true }),
      Animated.spring(squash, { toValue: 0, friction: 3, tension: 160, useNativeDriver: true }),
    ]).start(() => {
      atRef.current = idx;
      busy.current = false;
      if (!alive.current) return;
      const id = page.units[idx]?.id;
      if (id) onPetSettled?.(id);
      done?.();
    });
  };

  useEffect(() => {
    if (still) return;
    const targetId = page.units[targetIdx]?.id;
    if (startIdx !== targetIdx) {
      const timer = setTimeout(() => hopTo(targetIdx), 650);
      return () => clearTimeout(timer);
    }
    if (savedIdx < 0) {
      Animated.spring(arrive, { toValue: 1, useNativeDriver: true, bounciness: 12, speed: 8 }).start(() => {
        if (targetId && alive.current) onPetSettled?.(targetId);
      });
    }
    return undefined;
  }, []);

  const onNodePress = (unit: Unit, i: number) => {
    if (still || busy.current) return;
    const state = states.get(unit.id) ?? "locked";
    if (state === "locked") {
      setShake((current) => ({ id: unit.id, n: current.n + 1 }));
      onLocked?.(unit);
      return;
    }
    hopTo(i, () => onSelect?.(unit));
  };

  const heroY = Animated.add(ty, Animated.multiply(lift, -ARC));
  const tiltDeg = Animated.multiply(tilt, dir).interpolate({ inputRange: [-1, 1], outputRange: ["-16deg", "16deg"] });
  const squashY = squash.interpolate({ inputRange: [-1, 0, 1], outputRange: [1.18, 1, 0.78] });
  const squashX = squash.interpolate({ inputRange: [-1, 0, 1], outputRange: [0.88, 1, 1.18] });
  const squashShift = squash.interpolate({ inputRange: [-1, 0, 1], outputRange: [-FROG_H * 0.09, 0, FROG_H * 0.11] });
  const arriveY = arrive.interpolate({ inputRange: [0, 1], outputRange: [-70, 0] });

  return (
    <View style={{ width, height, backgroundColor: book.paper, borderRadius: 12, overflow: "hidden" }}>
      <View style={styles.gutter} />
      <View style={styles.pond} />
      <PondDecor width={width} height={height} />

      <View style={styles.ribbon}>
        <Text style={styles.ribbonTitle} numberOfLines={1}>
          {page.title}
        </Text>
        <View style={styles.count}>
          <Text style={styles.countText}>
            {doneCount} / {n}
          </Text>
        </View>
      </View>

      {page.units.map((unit, i) => {
        const best = progress.get(unit.id);
        return (
          <View key={unit.id} style={{ position: "absolute", left: cxOf(i) - NODE_W / 2, top: topOf(i), zIndex: 5 }}>
            <CapyNode
              state={states.get(unit.id) ?? "locked"}
              icon={iconFor(unit)}
              stars={best ? starsFor(best.best_correct, best.total) : 0}
              title={unit.title}
              shakeKey={shake.id === unit.id ? shake.n : 0}
              phase={i}
              onPress={() => onNodePress(unit, i)}
            />
          </View>
        );
      })}

      <Animated.View
        pointerEvents="none"
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: FROG_W,
          height: FROG_H,
          zIndex: 20,
          elevation: 20,
          opacity: arrive,
          transform: [
            { translateX: tx },
            { translateY: heroY },
            { translateY: arriveY },
            { translateY: squashShift },
            { rotate: tiltDeg },
            { scaleX: squashX },
            { scaleY: squashY },
          ],
        }}
      >
        <Animated.View style={{ transform: [{ scaleY: breath }] }}>
          <Frog size={FROG_W} air={lift} />
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  gutter: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 12,
    backgroundColor: "rgba(0,0,0,0.07)",
    borderRightWidth: 1,
    borderRightColor: "rgba(0,0,0,0.12)",
  },
  pond: {
    position: "absolute",
    left: 18,
    right: 10,
    top: HEADER_BOTTOM,
    bottom: 12,
    borderRadius: 28,
    backgroundColor: book.pond,
    borderWidth: 4,
    borderColor: book.pondDeep,
  },
  ribbon: {
    position: "absolute",
    left: 20,
    right: 12,
    top: 10,
    height: 50,
    borderRadius: 12,
    backgroundColor: book.ribbon,
    borderBottomWidth: 4,
    borderBottomColor: book.ribbonDark,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    zIndex: 10,
  },
  ribbonTitle: { color: "#FFFFFF", fontFamily: font.display, fontSize: 24, flexShrink: 1 },
  count: { backgroundColor: "rgba(255,255,255,0.22)", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  countText: { color: "#FFFFFF", fontFamily: font.bold, fontSize: 15 },
});
