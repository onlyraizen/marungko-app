import Svg, { Circle, Ellipse, Path } from "react-native-svg";

export type FrogMood = "happy" | "cheer" | "sad";
type Props = { size?: number; mood?: FrogMood };

const FROG = "#7BD65B";
const FROG_DARK = "#58B83F";
const OUTLINE = "#2F7A24";
const BELLY = "#C9F2A8";
const EYE = "#1B2A1B";
const CHEEK = "#F7A8B8";
const MOUTH = "#7A2E2E";

/** Our own little frog: big bulging eyes, a pale belly, and a wide smile. */
export default function FrogArt({ size = 52, mood = "happy" }: Props) {
  return (
    <Svg width={size} height={size * 0.8} viewBox="0 0 100 80">
      {/* feet */}
      <Ellipse cx={27} cy={70} rx={13} ry={6.5} fill={FROG_DARK} stroke={OUTLINE} strokeWidth={2.5} />
      <Ellipse cx={73} cy={70} rx={13} ry={6.5} fill={FROG_DARK} stroke={OUTLINE} strokeWidth={2.5} />

      {/* body and belly */}
      <Ellipse cx={50} cy={50} rx={35} ry={25} fill={FROG} stroke={OUTLINE} strokeWidth={3} />
      <Ellipse cx={50} cy={60} rx={21} ry={11} fill={BELLY} opacity={0.85} />

      {/* eyes */}
      <Circle cx={30} cy={27} r={15} fill={FROG} stroke={OUTLINE} strokeWidth={3} />
      <Circle cx={70} cy={27} r={15} fill={FROG} stroke={OUTLINE} strokeWidth={3} />
      <Circle cx={30} cy={26} r={10.5} fill="#FFFFFF" />
      <Circle cx={70} cy={26} r={10.5} fill="#FFFFFF" />
      <Circle cx={mood === "sad" ? 30 : 32} cy={mood === "sad" ? 29 : 27} r={5.5} fill={EYE} />
      <Circle cx={mood === "sad" ? 70 : 72} cy={mood === "sad" ? 29 : 27} r={5.5} fill={EYE} />
      <Circle cx={34} cy={24.5} r={1.9} fill="#FFFFFF" />
      <Circle cx={74} cy={24.5} r={1.9} fill="#FFFFFF" />

      <Ellipse cx={22} cy={50} rx={5.5} ry={3.8} fill={CHEEK} opacity={0.8} />
      <Ellipse cx={78} cy={50} rx={5.5} ry={3.8} fill={CHEEK} opacity={0.8} />

      {/* mouth */}
      {mood === "cheer" ? (
        <>
          <Path d="M36 49 Q50 72 64 49 Z" fill={MOUTH} stroke={EYE} strokeWidth={3} strokeLinejoin="round" />
          <Ellipse cx={50} cy={58} rx={8} ry={4} fill="#F08A8A" />
        </>
      ) : mood === "sad" ? (
        <Path d="M38 58 Q50 49 62 58" stroke={EYE} strokeWidth={3} strokeLinecap="round" fill="none" />
      ) : (
        <Path d="M36 50 Q50 64 64 50" stroke={EYE} strokeWidth={3} strokeLinecap="round" fill="none" />
      )}
    </Svg>
  );
}
