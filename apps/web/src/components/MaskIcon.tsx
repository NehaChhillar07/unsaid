// brand mark — a speech bubble holding an ellipsis: the words left "unsaid".
// ported 1:1 from the design prototype (unsaid-core.jsx).
export function MaskIcon({ size = 13, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ display: 'block' }} aria-hidden="true">
      <path
        d="M5 4h14a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3h-7l-4.5 3.5V16H5a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3z"
        fill={color}
        fillOpacity="0.16"
        stroke={color}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <circle cx="8" cy="10" r="1.15" fill={color} />
      <circle cx="12" cy="10" r="1.15" fill={color} />
      <circle cx="16" cy="10" r="1.15" fill={color} />
    </svg>
  );
}
