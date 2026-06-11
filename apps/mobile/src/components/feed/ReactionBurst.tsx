import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

export interface ParticleSpec {
  id: number;
  x: number;
  y: number;
  dx: number;
  rot: number;
  size: number;
  dur: number;
  glyph: string;
}

/** Builds the 9-particle 🤍💗🩷 burst spec around an origin point. */
export function makeBurst(origin: { x: number; y: number }): ParticleSpec[] {
  const id0 = Date.now();
  const glyphs = ['🤍', '💗', '🩷'];
  return Array.from({ length: 9 }, (_, i) => ({
    id: id0 + i,
    x: origin.x + (Math.random() * 30 - 15),
    y: origin.y + (Math.random() * 14 - 7),
    dx: Math.random() * 80 - 40,
    rot: Math.random() * 50 - 25,
    size: 16 + Math.random() * 16,
    dur: 1000 + Math.random() * 700,
    glyph: glyphs[Math.floor(Math.random() * glyphs.length)],
  }));
}

function Particle({ p }: { p: ParticleSpec }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withTiming(1, { duration: p.dur, easing: Easing.bezier(0.2, 0.7, 0.3, 1) });
  }, [p.dur, t]);

  const style = useAnimatedStyle(() => ({
    opacity: t.value < 0.18 ? 1 : Math.max(0, 1 - (t.value - 0.18) / 0.82),
    transform: [
      { translateX: t.value * p.dx },
      { translateY: t.value * -160 },
      { rotate: `${t.value * p.rot}deg` },
    ],
  }));

  return (
    <Animated.View style={[{ position: 'absolute', left: p.x, top: p.y }, style]}>
      <Text style={{ fontSize: p.size }}>{p.glyph}</Text>
    </Animated.View>
  );
}

export function ReactionBurst({ particles }: { particles: ParticleSpec[] }) {
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { zIndex: 40 }]}>
      {particles.map((p) => (
        <Particle key={p.id} p={p} />
      ))}
    </View>
  );
}
