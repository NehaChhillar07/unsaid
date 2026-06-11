/** '#RRGGBB' + alpha (0..1) → 'rgba(r,g,b,a)' */
export function withAlpha(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export interface GradientPoints {
  start: { x: number; y: number };
  end: { x: number; y: number };
}

/**
 * Converts a CSS linear-gradient angle (deg, 0 = to top, clockwise)
 * into expo-linear-gradient start/end points.
 */
export function gradientPoints(angleDeg: number): GradientPoints {
  const rad = (angleDeg * Math.PI) / 180;
  const x = Math.sin(rad) / 2;
  const y = Math.cos(rad) / 2;
  return {
    start: { x: 0.5 - x, y: 0.5 + y },
    end: { x: 0.5 + x, y: 0.5 - y },
  };
}
