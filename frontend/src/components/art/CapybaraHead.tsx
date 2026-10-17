import { useEffect, useState } from "react";
import Svg, { Circle, Ellipse, G, Path, Rect } from "react-native-svg";

export type CapyMood = "happy" | "cheer" | "sad" | "sleep";
type Props = {
  size?: number;
  mood?: CapyMood;
  /** The mouth opens and closes while true. */
  talking?: boolean;
  /** Blinks now and then. */
  blink?: boolean;
};

const OUTLINE = "#8A5028";
const BODY = "#E5A367";
const BODY_LIGHT = "#F2BF8B";
const SNOUT = "#C98B5A";
const EAR = "#D58F56";
const EAR_INNER = "#B87444";
const NOSE = "#5A3420";
const EYE = "#3A2416";
const CHEEK = "#F29A8F";
const MOUTH = "#7A2E2E";
const TONGUE = "#F08A8A";
const EYES_X = [66, 134] as const;

/** Our own capybara: a wide block head, small ears, a darker snout patch and a "w" smile. */
export default function CapybaraHead({ size = 120, mood = "happy", talking = false, blink = true }: Props) {
  const [closed, setClosed] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!blink || mood === "cheer" || mood === "sleep") return;
    let wait: ReturnType<typeof setTimeout> | undefined;
    let shut: ReturnType<typeof setTimeout> | undefined;
    const schedule = () => {
      wait = setTimeout(() => {
        setClosed(true);
        shut = setTimeout(() => {
          setClosed(false);
          schedule();
        }, 130);
      }, 2200 + Math.random() * 2400);
    };
    schedule();
    return () => {
      if (wait) clearTimeout(wait);
      if (shut) clearTimeout(shut);
    };
  }, [blink, mood]);

  useEffect(() => {
    if (!talking) {
      setOpen(false);
      return;
    }
    const id = setInterval(() => setOpen((value) => !value), 170);
    return () => clearInterval(id);
  }, [talking]);

  const wide = mood === "cheer";
  const arcClosed = (cx: number) => `M${cx - 9} 68 Q${cx} 75 ${cx + 9} 68`;
  const arcHappy = (cx: number) => `M${cx - 9} 70 Q${cx} 58 ${cx + 9} 70`;

  return (
    <Svg width={size} height={size * 0.75} viewBox="0 0 200 150">
      {/* ears */}
      <Ellipse cx={52} cy={34} rx={16} ry={14} fill={EAR} stroke={OUTLINE} strokeWidth={3} />
      <Ellipse cx={52} cy={36} rx={8} ry={7} fill={EAR_INNER} />
      <Ellipse cx={148} cy={34} rx={16} ry={14} fill={EAR} stroke={OUTLINE} strokeWidth={3} />
      <Ellipse cx={148} cy={36} rx={8} ry={7} fill={EAR_INNER} />

      {/* head */}
      <Path
        d="M28 72 C28 42 54 26 100 26 C146 26 172 42 172 72 L172 102 C172 126 148 140 100 140 C52 140 28 126 28 102 Z"
        fill={BODY}
        stroke={OUTLINE}
        strokeWidth={3.5}
        strokeLinejoin="round"
      />
      <Ellipse cx={100} cy={44} rx={42} ry={9} fill={BODY_LIGHT} opacity={0.7} />
      <Ellipse cx={46} cy={92} rx={11} ry={7} fill={CHEEK} opacity={0.55} />
      <Ellipse cx={154} cy={92} rx={11} ry={7} fill={CHEEK} opacity={0.55} />

      {/* snout */}
      <Rect x={58} y={76} width={84} height={56} rx={28} fill={SNOUT} />
      <Path d="M86 82 Q100 73 114 82 Q114 95 100 97 Q86 95 86 82 Z" fill={NOSE} />
      <Ellipse cx={95} cy={84} rx={4} ry={2.2} fill="#FFFFFF" opacity={0.35} />
      <Path d="M100 97 L100 106" stroke={EYE} strokeWidth={3} strokeLinecap="round" />

      {/* mouth */}
      {mood === "sad" ? (
        <Path d="M84 114 Q100 100 116 114" stroke={EYE} strokeWidth={3.2} strokeLinecap="round" fill="none" />
      ) : talking && open ? (
        <>
          <Path d="M84 106 Q100 130 116 106 Z" fill={MOUTH} stroke={EYE} strokeWidth={3} strokeLinejoin="round" />
          <Ellipse cx={100} cy={114} rx={8} ry={4} fill={TONGUE} />
        </>
      ) : wide ? (
        <>
          <Path d="M80 104 Q100 138 120 104 Z" fill={MOUTH} stroke={EYE} strokeWidth={3} strokeLinejoin="round" />
          <Ellipse cx={100} cy={116} rx={10} ry={5} fill={TONGUE} />
        </>
      ) : (
        <Path
          d="M82 108 Q91 118 100 108 Q109 118 118 108"
          stroke={EYE}
          strokeWidth={3.2}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      )}

      {/* eyes */}
      {EYES_X.map((cx) =>
        mood === "cheer" ? (
          <Path key={cx} d={arcHappy(cx)} stroke={EYE} strokeWidth={4} strokeLinecap="round" fill="none" />
        ) : mood === "sleep" || closed ? (
          <Path key={cx} d={arcClosed(cx)} stroke={EYE} strokeWidth={4} strokeLinecap="round" fill="none" />
        ) : (
          <G key={cx}>
            <Ellipse cx={cx} cy={66} rx={7} ry={9} fill={EYE} />
            <Circle cx={cx + 2} cy={62} r={2.6} fill="#FFFFFF" />
          </G>
        ),
      )}

      {mood === "sad" ? (
        <>
          <Path d="M54 58 L76 52" stroke={EYE} strokeWidth={3.2} strokeLinecap="round" />
          <Path d="M124 52 L146 58" stroke={EYE} strokeWidth={3.2} strokeLinecap="round" />
        </>
      ) : null}
    </Svg>
  );
}
