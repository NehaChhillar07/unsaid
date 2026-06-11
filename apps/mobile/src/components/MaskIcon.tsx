import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';

/**
 * Brand mark — a speech bubble holding an ellipsis: the words left "unsaid".
 * Exact SVG path port from the design prototype (unsaid-core.jsx).
 */
export function MaskIcon({ size = 13, color = '#3B332B' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M5 4h14a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3h-7l-4.5 3.5V16H5a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3z"
        fill={color}
        fillOpacity={0.16}
        stroke={color}
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
      <Circle cx={8} cy={10} r={1.15} fill={color} />
      <Circle cx={12} cy={10} r={1.15} fill={color} />
      <Circle cx={16} cy={10} r={1.15} fill={color} />
    </Svg>
  );
}
