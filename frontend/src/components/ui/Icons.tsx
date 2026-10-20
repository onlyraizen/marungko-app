import Svg, { Circle, Path, Rect } from "react-native-svg";

/** Small vector icons copied from the UI pack's screens, so there is no icon font to load. */
type P = { size?: number; color?: string };

export function CloseIcon({ size = 26, color = "#5A3318" }: P) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M5 5 L19 19 M19 5 L5 19" stroke={color} strokeWidth={3} strokeLinecap="round" fill="none" />
    </Svg>
  );
}

export function BackIcon({ size = 26, color = "#5A3318" }: P) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M20 12 H5 M11 5.5 L4.5 12 L11 18.5" fill="none" stroke={color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function ChevronIcon({ size = 22, color = "#7A6A55" }: P) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M9 5 L16 12 L9 19" fill="none" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/** The yuzu fruit that counts a child's right answers. */
export function YuzuIcon({ size = 28 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 28 28">
      <Circle cx={14} cy={16} r={10} fill="#E0A91B" />
      <Circle cx={14} cy={14.5} r={10} fill="#F7C531" />
      <Path d="M14 5 Q15 0 21 0 Q20 5 14 5 Z" fill="#5BAA3C" />
    </Svg>
  );
}

export function StarIcon({ size = 26, filled = true }: { size?: number; filled?: boolean }) {
  return (
    <Svg width={size} height={size} viewBox="-16 -16 32 32">
      <Path
        d="M0 -14 L4 -4.5 L14 -4 L6.5 2.5 L9 12.5 L0 7 L-9 12.5 L-6.5 2.5 L-14 -4 L-4 -4.5 Z"
        fill={filled ? "#F7C531" : "rgba(0,0,0,0.18)"}
        stroke={filled ? "#E0A91B" : "rgba(0,0,0,0.12)"}
        strokeWidth={2}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function SpeakerIcon({ size = 24, color = "#12303F" }: P) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M4 9 H8 L13 5 V19 L8 15 H4 Z" fill={color} />
      <Path d="M16 9 Q19 12 16 15 M18.5 6.5 Q23 12 18.5 17.5" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

/** The static sound-wave drawn next to the speaker button in the "listen" bubble. */
export function WaveIcon({ width = 140, height = 40, color = "#2F95CF" }: { width?: number; height?: number; color?: string }) {
  const bars: [number, number, number][] = [
    [2, 15, 10], [11, 11, 18], [20, 6, 28], [29, 13, 14], [38, 4, 32], [47, 9, 22],
    [56, 2, 36], [65, 12, 16], [74, 7, 26], [83, 14, 12], [92, 10, 20], [101, 16, 8],
  ];
  return (
    <Svg width={width} height={height} viewBox="0 0 108 40" fill={color}>
      {bars.map(([x, y, h]) => (
        <Rect key={x} x={x} y={y} width={4} height={h} rx={2} />
      ))}
    </Svg>
  );
}

export function MicIcon({ size = 52, color = "#12303F", slashed = false }: P & { slashed?: boolean }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x={8.5} y={2.5} width={7} height={12} rx={3.5} fill={color} />
      <Path
        d={slashed ? "M5 11.5 a7 7 0 0 0 14 0 M12 18.5 V21.5 M8.5 21.5 H15.5 M4 3 L20 21" : "M5 11.5 a7 7 0 0 0 14 0 M12 18.5 V21.5 M8.5 21.5 H15.5"}
        fill="none"
        stroke={color}
        strokeWidth={2.2}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function CheckIcon({ size = 20, color = "#FFFFFF" }: P) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M5 12.5 L10 17.5 L19 7" fill="none" stroke={color} strokeWidth={3.4} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function CrossIcon({ size = 18, color = "#FFFFFF" }: P) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M6 6 L18 18 M18 6 L6 18" stroke={color} strokeWidth={3.6} strokeLinecap="round" fill="none" />
    </Svg>
  );
}

export function ShareIcon({ size = 24, color = "#2E8B45" }: P) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M12 15 V4 M7.5 8.5 L12 4 L16.5 8.5 M5 12 V19 H19 V12" fill="none" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function FlagIcon({ size = 24, color = "#2E8B45", filled = false }: P & { filled?: boolean }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M6 21 V4 M6 5 H18 L15 9.5 L18 14 H6"
        fill={filled ? color : "none"}
        stroke={color}
        strokeWidth={2.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function ThumbIcon({ size = 28, color = "#8A7B66", down = false, filled = false }: P & { down?: boolean; filled?: boolean }) {
  const d = down
    ? "M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zM17 2h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"
    : "M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3";
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d={d} fill={filled ? color : "none"} stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
    </Svg>
  );
}

export function EyeIcon({ size = 26, color = "#5BC0F5", off = false }: P & { off?: boolean }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M2 12 Q12 3 22 12 Q12 21 2 12 Z" fill="none" stroke={color} strokeWidth={2.2} strokeLinejoin="round" />
      <Circle cx={12} cy={12} r={3} fill={color} />
      {off ? <Path d="M4 20 L20 4" stroke={color} strokeWidth={2.4} strokeLinecap="round" /> : null}
    </Svg>
  );
}

export function LockIcon({ size = 34, color = "#FFFFFF" }: P) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x={5} y={11} width={14} height={10} rx={3} fill={color} />
      <Path d="M8 11 V8 a4 4 0 0 1 8 0 V11" fill="none" stroke={color} strokeWidth={2.6} strokeLinecap="round" />
    </Svg>
  );
}

export function GearIcon({ size = 24, color = "#FFFFFF" }: P) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M12 8.2 A3.8 3.8 0 1 0 12 15.8 A3.8 3.8 0 1 0 12 8.2 Z M10.4 2.6 H13.6 L14.1 5 Q15 5.3 15.8 5.9 L18.1 5 L19.7 7.8 L17.8 9.4 Q18 10.2 17.9 11 L17.9 13 Q18 13.8 17.8 14.6 L19.7 16.2 L18.1 19 L15.8 18.1 Q15 18.7 14.1 19 L13.6 21.4 H10.4 L9.9 19 Q9 18.7 8.2 18.1 L5.9 19 L4.3 16.2 L6.2 14.6 Q6 13.8 6.1 13 L6.1 11 Q6 10.2 6.2 9.4 L4.3 7.8 L5.9 5 L8.2 5.9 Q9 5.3 9.9 5 Z"
        fill={color}
        fillRule="evenodd"
      />
    </Svg>
  );
}

export function FlameIcon({ size = 28 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M12 2 C13 6 18 8 18 14 A6 6 0 0 1 6 14 C6 11 8 10 9 8 C10 10 11 10 11.5 9 C12 7 11 4 12 2 Z" fill="#F26B52" />
      <Path d="M12 11 C12.5 13 15 13.5 15 16 A3 3 0 0 1 9 16 C9 14 11 14 12 11 Z" fill="#F7C531" />
    </Svg>
  );
}

export function BoltIcon({ size = 28 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M13.5 2 L5 13.5 H11 L10 22 L19 10 H12.8 Z" fill="#F7C531" stroke="#D9A21B" strokeWidth={1.4} strokeLinejoin="round" />
    </Svg>
  );
}

export function PlusIcon({ size = 26, color = "#A58F78" }: P) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M12 5 V19 M5 12 H19" stroke={color} strokeWidth={2.6} strokeLinecap="round" />
    </Svg>
  );
}
