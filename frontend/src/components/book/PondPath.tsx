import type { Unit } from "@marungko/shared";
import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View, type LayoutChangeEvent } from "react-native";
import { useAppStore } from "../../store/useAppStore";
import { book } from "../../theme/book";
import { colors } from "../../theme/colors";
import { font } from "../../theme/fonts";
import Frog from "../art/Frog";
import Button3D from "../ui/Button3D";
import { BackIcon } from "../ui/Icons";
import type { BookView } from "./books";
import CapyNode, { FROG_DX, FROG_DY, FROG_H, FROG_W, NODE_H, NODE_W } from "./CapyNode";
import PondDecor from "./PondDecor";
import { iconFor, starsFor, type UnitState } from "./pages";

type Progress = ReadonlyMap<string, { best_correct: number; total: number }>;
type Props = {
  childId: string;
  view: BookView;
  /** Every lesson in the app, in order, so locks carry across books. */
  allUnits: readonly Unit[];
  progress: Progress;
  /** Demo switch: open every lesson regardless of progress. */
  unlockAll: boolean;
  onBack: () => void;
  onStart: (unit: Unit) => void;
};

const ARC = 64;
const SPACING = 190;
const BANNER_H = 46;
const TOP_PAD = 26;

type Placed = { unit: Unit; index: number; top: number; groupTitle: string | null };

/**
 * One book as a continuous pond: the lessons are capybaras zig-zagging down a long scroll, with a frog
 * that hops from one to the next. There are no pages to turn; a lesson opens once the one before it is done.
 */
export default function PondPath({ childId, view, allUnits, progress, unlockAll, onBack, onStart }: Props) {
  const [width, setWidth] = useState(0);
  const scroller = useRef<ScrollView>(null);
  const [selected, setSelected] = useState<Unit | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [shake, setShake] = useState<{ id: string; n: number }>({ id: "", n: 0 });
  const hintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const slide = useRef(new Animated.Value(300)).current;

  const petUnitId = useAppStore((state) => state.petUnit[childId]);
  const setPetUnit = useAppStore((state) => state.setPetUnit);

  // Every lesson in the app has a state; the first one not finished is "current".
  const states = useMemo(() => {
    const map = new Map<string, UnitState>();
    const playable = allUnits.filter((unit) => unit.syllables.length + unit.words.length > 0);
    const firstOpen = playable.findIndex((unit) => !progress.has(unit.id));
    playable.forEach((unit, i) => {
      map.set(unit.id, progress.has(unit.id) ? "done" : i === firstOpen ? "current" : unlockAll ? "open" : "locked");
    });
    return map;
  }, [allUnits, progress, unlockAll]);

  // Lay the lessons out down the path, with a banner before each titled group.
  const { placed, banners, contentH } = useMemo(() => {
    const list: Placed[] = [];
    const bannerList: { title: string; top: number }[] = [];
    let y = TOP_PAD;
    let n = 0;
    view.groups.forEach((group, g) => {
      if (group.title && view.groups.length > 1) {
        bannerList.push({ title: group.title, top: y });
        y += BANNER_H + 14;
      } else if (g > 0) {
        y += 10;
      }
      group.units.forEach((unit) => {
        list.push({ unit, index: n, top: y, groupTitle: group.title });
        y += SPACING;
        n += 1;
      });
    });
    return { placed: list, banners: bannerList, contentH: y + 60 };
  }, [view.groups]);

  const n = placed.length;
  const cxOf = (i: number): number => (width <= 0 ? 0 : n === 1 ? width / 2 : width * (i % 2 === 0 ? 0.3 : 0.7));
  const frogAt = (i: number) => ({ x: cxOf(i) - NODE_W / 2 + FROG_DX, y: (placed[i]?.top ?? 0) + FROG_DY });

  const firstUnfinished = placed.findIndex((p) => states.get(p.unit.id) !== "done");
  const savedIdx = placed.findIndex((p) => p.unit.id === petUnitId);
  const targetIdx = unlockAll && savedIdx >= 0 ? savedIdx : firstUnfinished >= 0 ? firstUnfinished : Math.max(0, n - 1);

  useEffect(
    () => () => {
      if (hintTimer.current !== null) clearTimeout(hintTimer.current);
    },
    [],
  );

  useEffect(() => {
    if (!selected) return;
    slide.setValue(300);
    Animated.spring(slide, { toValue: 0, useNativeDriver: true, bounciness: 6 }).start();
  }, [selected, slide]);

  const showHint = (message: string) => {
    setHint(message);
    if (hintTimer.current !== null) clearTimeout(hintTimer.current);
    hintTimer.current = setTimeout(() => setHint(null), 2800);
  };

  const onLayout = (event: LayoutChangeEvent) => {
    const w = event.nativeEvent.layout.width;
    if (w > 0 && Math.abs(w - width) > 1) setWidth(w);
  };

  const selectedState: UnitState = selected ? (states.get(selected.id) ?? "locked") : "locked";
  const selectedBest = selected ? progress.get(selected.id) : undefined;
  const doneCount = placed.filter((p) => states.get(p.unit.id) === "done").length;

  return (
    <View style={styles.root}>
      <View style={[styles.banner, { backgroundColor: view.look.face, borderBottomColor: view.look.lip }]}>
        <Pressable onPress={onBack} style={[styles.backBtn, { backgroundColor: view.look.lip }]} accessibilityRole="button" accessibilityLabel="Bumalik sa mga libro">
          <BackIcon size={22} color="#FFFFFF" />
        </Pressable>
        <View style={styles.bannerText}>
          <Text style={styles.kicker}>{view.title.toUpperCase()}</Text>
          <Text style={styles.bannerTitle} numberOfLines={1}>
            {view.subtitle}
          </Text>
        </View>
        <View style={[styles.count, { backgroundColor: view.look.lip }]}>
          <Text style={styles.countText}>
            {doneCount} / {n}
          </Text>
        </View>
      </View>

      <View style={styles.flex} onLayout={onLayout}>
        {width > 0 && n > 0 ? (
          <PondScroll
            key={`${view.id}:${width}`}
            scroller={scroller}
            width={width}
            contentH={contentH}
            banners={banners}
            placed={placed}
            states={states}
            progress={progress}
            cxOf={cxOf}
            frogAt={frogAt}
            savedIdx={savedIdx}
            targetIdx={targetIdx}
            shake={shake}
            lookLip={view.look.lip}
            onSettled={(unitId) => setPetUnit(childId, unitId)}
            onSelect={setSelected}
            onLocked={(unit) => {
              setShake((current) => ({ id: unit.id, n: current.n + 1 }));
              showHint("Tapusin muna ang nakaraang aralin.");
            }}
          />
        ) : null}

        {hint ? (
          <View style={styles.hint}>
            <Text style={styles.hintText}>{hint}</Text>
          </View>
        ) : null}

        {selected ? (
          <>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setSelected(null)} accessibilityLabel="Isara" />
            <Animated.View style={[styles.panel, { transform: [{ translateY: slide }] }]}>
              <View style={styles.panelHead}>
                <Text style={styles.panelTitle}>{selected.title}</Text>
                {selected.review === "draft" ? <Text style={styles.badge}>DRAFT</Text> : null}
              </View>
              <Text style={styles.panelMeta}>
                {selected.syllables.length} pantig · {selected.words.length} salita
              </Text>
              {selectedBest ? (
                <Text style={styles.panelBest}>
                  Pinakamataas: {selectedBest.best_correct} / {selectedBest.total}
                </Text>
              ) : null}
              <Button3D
                label={selectedState === "done" ? "Ulitin" : "Magsimula"}
                onPress={() => {
                  const unit = selected;
                  setSelected(null);
                  onStart(unit);
                }}
                style={styles.panelButton}
              />
            </Animated.View>
          </>
        ) : null}
      </View>
    </View>
  );
}

type ScrollProps = {
  scroller: React.RefObject<ScrollView | null>;
  width: number;
  contentH: number;
  banners: { title: string; top: number }[];
  placed: Placed[];
  states: ReadonlyMap<string, UnitState>;
  progress: Progress;
  cxOf: (i: number) => number;
  frogAt: (i: number) => { x: number; y: number };
  savedIdx: number;
  targetIdx: number;
  shake: { id: string; n: number };
  lookLip: string;
  onSettled: (unitId: string) => void;
  onSelect: (unit: Unit) => void;
  onLocked: (unit: Unit) => void;
};

/** The scrolling pond itself, with the frog. Remounted when the book or the width changes. */
function PondScroll(props: ScrollProps) {
  const { scroller, width, contentH, banners, placed, states, progress, cxOf, frogAt, savedIdx, targetIdx, shake, lookLip, onSettled, onSelect, onLocked } = props;

  // The frog starts where it last sat and hops to where it should be now.
  const [startIdx] = useState(() => (savedIdx >= 0 ? savedIdx : targetIdx));
  const start = frogAt(startIdx);
  const tx = useRef(new Animated.Value(start.x)).current;
  const ty = useRef(new Animated.Value(start.y)).current;
  const lift = useRef(new Animated.Value(0)).current;
  const squash = useRef(new Animated.Value(0)).current;
  const tilt = useRef(new Animated.Value(0)).current;
  const dir = useRef(new Animated.Value(1)).current;
  const breath = useRef(new Animated.Value(1)).current;
  const arrive = useRef(new Animated.Value(savedIdx >= 0 ? 1 : 0)).current;
  const atRef = useRef(startIdx);
  const busy = useRef(false);
  const alive = useRef(true);

  useEffect(
    () => () => {
      alive.current = false;
    },
    [],
  );

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breath, { toValue: 1.05, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(breath, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [breath]);

  const scrollTo = (index: number, animated: boolean) => {
    const top = placed[index]?.top ?? 0;
    scroller.current?.scrollTo({ y: Math.max(0, top - 150), animated });
  };

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
      Animated.timing(squash, { toValue: 1, duration: 140, useNativeDriver: true }),
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
      Animated.timing(squash, { toValue: 1, duration: 90, useNativeDriver: true }),
      Animated.spring(squash, { toValue: 0, friction: 3, tension: 160, useNativeDriver: true }),
    ]).start(() => {
      atRef.current = idx;
      busy.current = false;
      if (!alive.current) return;
      const id = placed[idx]?.unit.id;
      if (id) onSettled(id);
      done?.();
    });
  };

  useEffect(() => {
    // Bring the frog's lesson into view first, then let it hop if it has somewhere to go.
    const jump = setTimeout(() => scrollTo(targetIdx, false), 30);
    const targetId = placed[targetIdx]?.unit.id;
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (startIdx !== targetIdx) {
      timer = setTimeout(() => hopTo(targetIdx), 700);
    } else if (savedIdx < 0) {
      Animated.spring(arrive, { toValue: 1, useNativeDriver: true, bounciness: 12, speed: 8 }).start(() => {
        if (targetId && alive.current) onSettled(targetId);
      });
    }
    return () => {
      clearTimeout(jump);
      if (timer) clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onNodePress = (unit: Unit, i: number) => {
    if (busy.current) return;
    const state = states.get(unit.id) ?? "locked";
    if (state === "locked") {
      onLocked(unit);
      return;
    }
    // A short scroll keeps the lesson in view while the frog hops to it.
    scrollTo(i, true);
    hopTo(i, () => onSelect(unit));
  };

  const heroY = Animated.add(ty, Animated.multiply(lift, -ARC));
  const tiltDeg = Animated.multiply(tilt, dir).interpolate({ inputRange: [-1, 1], outputRange: ["-16deg", "16deg"] });
  const squashY = squash.interpolate({ inputRange: [-1, 0, 1], outputRange: [1.18, 1, 0.78] });
  const squashX = squash.interpolate({ inputRange: [-1, 0, 1], outputRange: [0.88, 1, 1.18] });
  const squashShift = squash.interpolate({ inputRange: [-1, 0, 1], outputRange: [-FROG_H * 0.09, 0, FROG_H * 0.11] });
  const arriveY = arrive.interpolate({ inputRange: [0, 1], outputRange: [-70, 0] });

  return (
    <ScrollView ref={scroller} showsVerticalScrollIndicator={false} contentContainerStyle={{ height: contentH }} style={styles.scroll}>
      <PondDecor width={width} height={contentH} />

      {/* Stepping ripples between one capybara and the next. */}
      {placed.slice(0, -1).map((p, i) => {
        const a = { x: cxOf(i), y: p.top + 88 };
        const next = placed[i + 1];
        const b = { x: cxOf(i + 1), y: (next?.top ?? 0) + 30 };
        return [0.25, 0.5, 0.75].map((f) => (
          <View
            key={`${p.unit.id}-${f}`}
            pointerEvents="none"
            style={[styles.ripple, { left: a.x + (b.x - a.x) * f - 9, top: a.y + (b.y - a.y) * f - 5 }]}
          />
        ));
      })}

      {banners.map((banner) => (
        <View key={banner.title} style={[styles.sectionRow, { top: banner.top }]} pointerEvents="none">
          <View style={styles.sectionLine} />
          <View style={[styles.sectionChip, { backgroundColor: lookLip }]}>
            <Text style={styles.sectionText}>{banner.title}</Text>
          </View>
          <View style={styles.sectionLine} />
        </View>
      ))}

      {placed.map((p, i) => {
        const best = progress.get(p.unit.id);
        return (
          <View key={p.unit.id} style={{ position: "absolute", left: cxOf(i) - NODE_W / 2, top: p.top, zIndex: 5 }}>
            <CapyNode
              state={states.get(p.unit.id) ?? "locked"}
              icon={iconFor(p.unit)}
              stars={best ? starsFor(best.best_correct, best.total) : 0}
              title={p.unit.title}
              shakeKey={shake.id === p.unit.id ? shake.n : 0}
              phase={i}
              onPress={() => onNodePress(p.unit, i)}
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: book.pond },
  flex: { flex: 1 },
  scroll: { flex: 1, backgroundColor: book.pond },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginHorizontal: 14,
    marginTop: 10,
    marginBottom: 6,
    paddingVertical: 10,
    paddingLeft: 10,
    paddingRight: 14,
    borderRadius: 18,
    borderBottomWidth: 6,
    zIndex: 10,
  },
  backBtn: { width: 40, height: 40, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  bannerText: { flex: 1 },
  kicker: { fontFamily: font.bold, fontSize: 12, letterSpacing: 1.6, color: "rgba(255,255,255,0.85)" },
  bannerTitle: { fontFamily: font.display, fontSize: 24, lineHeight: 34, color: "#FFFFFF", includeFontPadding: false },
  count: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4 },
  countText: { fontFamily: font.bold, fontSize: 15, color: "#FFFFFF" },
  ripple: { position: "absolute", width: 18, height: 10, borderRadius: 9, backgroundColor: "rgba(255,255,255,0.45)" },
  sectionRow: { position: "absolute", left: 20, right: 20, height: BANNER_H, flexDirection: "row", alignItems: "center", gap: 12 },
  sectionLine: { flex: 1, height: 3, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.55)" },
  sectionChip: { borderRadius: 16, paddingHorizontal: 18, paddingVertical: 6 },
  sectionText: { fontFamily: font.display, fontSize: 20, lineHeight: 30, color: "#FFFFFF", includeFontPadding: false },
  hint: { position: "absolute", left: 16, right: 16, bottom: 18, backgroundColor: "rgba(58,34,16,0.94)", borderRadius: 12, padding: 12, zIndex: 30 },
  hintText: { color: "#FFFFFF", fontFamily: font.bold, fontSize: 15, textAlign: "center" },
  panel: {
    position: "absolute",
    left: 10,
    right: 10,
    bottom: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    borderWidth: 2,
    borderBottomWidth: 6,
    borderColor: colors.border,
    padding: 16,
    gap: 6,
    zIndex: 40,
    elevation: 40,
  },
  panelHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  panelTitle: { color: book.ink, fontFamily: font.display, fontSize: 26, lineHeight: 38, flexShrink: 1, includeFontPadding: false },
  panelMeta: { color: colors.muted, fontFamily: font.body, fontSize: 15 },
  panelBest: { color: colors.primaryInk, fontFamily: font.bold, fontSize: 15 },
  panelButton: { marginTop: 8 },
  badge: {
    fontSize: 11,
    fontFamily: font.bold,
    color: "#B07A00",
    borderWidth: 1,
    borderColor: "#B07A00",
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
});
