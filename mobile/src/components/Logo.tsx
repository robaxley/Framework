import Svg, { Rect } from "react-native-svg";

// Matches the mark embedded inline in diy-vault/public/index.html exactly.
export function Logo({ size = 36 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 116 116">
      <Rect width={116} height={116} rx={26} fill="#1a1512" />
      <Rect x={32} y={24} width={24} height={64} fill="#c8763a" />
      <Rect x={64} y={24} width={24} height={28} fill="#c8763a" />
    </Svg>
  );
}
