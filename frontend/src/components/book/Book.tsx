import type { Unit } from "@marungko/shared";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Animated, Easing, StyleSheet, Text, View, type LayoutChangeEvent } from "react-native";
import { useAppStore } from "../../store/useAppStore";
import { book } from "../../theme/book";
import Button3D from "../ui/Button3D";
import BookPage from "./BookPage";
import { buildPages, type UnitState } from "./pages";

type Progress = ReadonlyMap<string, { best_correct: number; total: number }>;
type Props = {
  childId: string;
  units: readonly Unit[];
  progress: Progress;
  /** Demo switch: open every page and lesson regardless of progress. */
  unlockAll: boolean;
  onStart: (unit: Unit) => void;
};
type Turn = { from: number; to: number; dir: 1 | -1 };

const hidden = { backfaceVisibility: "hidden" } as const;

function Pulse({ active, children }: { active: boolean; children: ReactNode }) {
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!active) {
      scale.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.08, duration: 500, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: 500, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [active, scale]);
  return <Animated.View style={{ transform: [{ scale }] }}>{children}</Animated.View>;
}

/** The back of a page while it is turning: blank paper with faint lines. */
function PaperBack() {
  return (
    <View style={{ flex: 1, backgroundColor: book.paperShade, borderRadius: 12, paddingTop: 40 }}>
      {Array.from({ length: 12 }, (_, i) => (
        <View key={i} style={{ height: 2, marginHorizontal: 28, marginBottom: 36, backgroundColor: book.paperLine }} />
      ))}
    </View>
  );
}

/** The storybook: pages of capybaras in a pond, a frog hopping between them, and pages that turn. */
export default function Book({ childId, units, progress, unlockAll, onStart }: Props) {
  const pages = useMemo(() => buildPages(units), [units]);
  const playable = useMemo(() => pages.flatMap((page) => page.units), [pages]);

  const states = useMemo(() => {
    const map = new Map<string, UnitState>();
    const firstOpen = playable.findIndex((unit) => !progress.has(unit.id));
    playable.forEach((unit, i) => {
      map.set(
        unit.id,
        progress.has(unit.id) ? "done" : i === firstOpen ? "current" : unlockAll ? "open" : "locked",
      );
    });
    return map;
  }, [playable, progress, unlockAll]);

  const petUnitId = useAppStore((state) => state.petUnit[childId]);
  const setPetUnit = useAppStore((state) => state.setPetUnit);

  const pageDone = useCallback(
    (index: number): boolean => pages[index]?.units.every((unit) => states.get(unit.id) === "done") ?? false,
    [pages, states],
  );
  const pageOpen = useCallback(
    (index: number): boolean => unlockAll || pages.slice(0, index).every((_, j) => pageDone(j)),
    [pages, pageDone, unlockAll],
  );

  // Open on the page the frog last sat on, or on the first unfinished page.
  const [pageIndex, setPageIndex] = useState(() => {
    const saved = petUnitId ? pages.findIndex((page) => page.units.some((unit) => unit.id === petUnitId)) : -1;
    if (saved >= 0) return saved;
    const unfinished = pages.findIndex((_, i) => !pageDone(i));
    return unfinished >= 0 ? unfinished : Math.max(0, pages.length - 1);
  });

  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const [turn, setTurn] = useState<Turn | null>(null);
  const [selected, setSelected] = useState<Unit | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const t = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(300)).current;
  const hintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const turnTo = (to: number) => {
    if (turn || to === pageIndex || to < 0 || to >= pages.length) return;
    setSelected(null);
    t.setValue(0);
    setTurn({ from: pageIndex, to, dir: to > pageIndex ? 1 : -1 });
    Animated.timing(t, { toValue: 1, duration: 950, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }).start(
      ({ finished }) => {
        if (finished) {
          setPageIndex(to);
          setTurn(null);
        }
      },
    );
  };

  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    if (width > 0 && height > 0) setSize({ w: width, h: height });
  };

  const page = pages[pageIndex];
  const nextIndex = pageIndex + 1 < pages.length ? pageIndex + 1 : null;
  const prevIndex = pageIndex > 0 ? pageIndex - 1 : null;
  const nextOpen = nextIndex !== null && pageOpen(nextIndex);
  const nextReady = nextOpen && pageDone(pageIndex);

  const selectedState: UnitState = selected ? (states.get(selected.id) ?? "locked") : "locked";
  const selectedBest = selected ? progress.get(selected.id) : undefined;

  const common = {
    states,
    progress,
    width: size?.w ?? 0,
    height: size?.h ?? 0,
    unlockAll,
    petUnitId,
  };

  const underIndex = turn ? (turn.dir === 1 ? turn.to : turn.from) : 0;
  const flipIndex = turn ? (turn.dir === 1 ? turn.from : turn.to) : 0;
  const underPage = pages[underIndex];
  const flipPage = pages[flipIndex];

  return (
    <View style={styles.frame}>
      <View style={styles.pageArea} onLayout={onLayout}>
        {size && page ? (
          <>
            <View style={styles.edgeFar} />
            <View style={styles.edgeNear} />

            {turn && underPage && flipPage ? (
              <>
                <View style={StyleSheet.absoluteFill}>
                  <BookPage key={`under-${underPage.id}`} page={underPage} {...common} still />
                </View>
                <Animated.View
                  pointerEvents="none"
                  style={[
                    StyleSheet.absoluteFill,
                    {
                      backgroundColor: "#000000",
                      borderRadius: 12,
                      opacity: t.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 0.3, 0] }),
                    },
                  ]}
                />
                <Animated.View
                  pointerEvents="none"
                  style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    width: size.w,
                    height: size.h,
                    transform: [
                      { perspective: 1400 },
                      { translateX: -size.w / 2 },
                      {
                        rotateY: t.interpolate({
                          inputRange: [0, 1],
                          outputRange: turn.dir === 1 ? ["0deg", "-180deg"] : ["-180deg", "0deg"],
                        }),
                      },
                      { translateX: size.w / 2 },
                    ],
                  }}
                >
                  <View style={[StyleSheet.absoluteFill, hidden]}>
                    <BookPage key={`flip-${flipPage.id}`} page={flipPage} {...common} still />
                  </View>
                  <View style={[StyleSheet.absoluteFill, hidden, { transform: [{ rotateY: "180deg" }] }]}>
                    <PaperBack />
                  </View>
                </Animated.View>
              </>
            ) : (
              <BookPage
                key={page.id}
                page={page}
                {...common}
                onPetSettled={(unitId) => setPetUnit(childId, unitId)}
                onSelect={setSelected}
                onLocked={() => showHint("Tapusin muna ang nakaraang aralin.")}
              />
            )}

            {hint ? (
              <View style={styles.hint}>
                <Text style={styles.hintText}>{hint}</Text>
              </View>
            ) : null}

            {selected && !turn ? (
              <>
                <View style={StyleSheet.absoluteFill} onTouchEnd={() => setSelected(null)} />
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
          </>
        ) : null}
      </View>

      <View style={styles.nav}>
        <View style={styles.navSide}>
          {prevIndex !== null ? <Button3D label="◀ Balik" tone="neutral" small onPress={() => turnTo(prevIndex)} /> : null}
        </View>
        <Text style={styles.counter}>
          Pahina {pageIndex + 1} / {pages.length}
        </Text>
        <View style={[styles.navSide, styles.navRight]}>
          {nextIndex !== null ? (
            <Pulse active={nextReady && !turn}>
              <Button3D
                label={nextOpen ? "Susunod ▶" : "🔒 Susunod"}
                tone={nextReady ? "accent" : nextOpen ? "primary" : "locked"}
                small
                onPress={() => {
                  if (nextOpen) turnTo(nextIndex);
                  else showHint("Tapusin muna ang lahat ng aralin sa pahinang ito.");
                }}
              />
            </Pulse>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    flex: 1,
    margin: 12,
    marginTop: 8,
    padding: 8,
    backgroundColor: book.cover,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: book.coverDark,
  },
  pageArea: { flex: 1 },
  edgeFar: {
    position: "absolute",
    left: 10,
    right: -7,
    top: 6,
    bottom: -6,
    backgroundColor: book.paperLine,
    borderRadius: 12,
  },
  edgeNear: {
    position: "absolute",
    left: 6,
    right: -4,
    top: 3,
    bottom: -3,
    backgroundColor: book.paperShade,
    borderRadius: 12,
  },
  nav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 12, minHeight: 56 },
  navSide: { flex: 1, flexDirection: "row" },
  navRight: { justifyContent: "flex-end" },
  counter: { color: book.paper, fontSize: 14, fontWeight: "700" },
  hint: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 18,
    backgroundColor: "rgba(59,42,24,0.92)",
    borderRadius: 12,
    padding: 12,
    zIndex: 30,
  },
  hintText: { color: "#FFFFFF", fontSize: 15, fontWeight: "600", textAlign: "center" },
  panel: {
    position: "absolute",
    left: 10,
    right: 10,
    bottom: 10,
    backgroundColor: "#FFFDF5",
    borderRadius: 20,
    borderWidth: 2,
    borderColor: book.paperLine,
    padding: 16,
    gap: 6,
    zIndex: 40,
    elevation: 40,
  },
  panelHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  panelTitle: { color: book.ink, fontSize: 22, fontWeight: "800", flexShrink: 1 },
  panelMeta: { color: "#6B5A45", fontSize: 15 },
  panelBest: { color: "#2F9553", fontSize: 15, fontWeight: "700" },
  panelButton: { marginTop: 8 },
  badge: {
    fontSize: 11,
    fontWeight: "800",
    color: "#B07A00",
    borderWidth: 1,
    borderColor: "#B07A00",
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
});
