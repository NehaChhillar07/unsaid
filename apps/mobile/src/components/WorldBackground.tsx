import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { WORLDS, type Mode } from '@unsaid/tokens';
import { gradientPoints } from '../theme/colors';
import { useTheme } from '../theme/ThemeContext';

// Reveal origin in the 402×874 prototype frame — personal toggle half is
// upper-left, professional half upper-right (AmbientMorph, unsaid-app.jsx).
const ORIGIN: Record<Mode, { x: number; y: number }> = {
  personal: { x: 96, y: 90 },
  professional: { x: 214, y: 90 },
};

function WorldLayer({ world, dark }: { world: Mode; dark: boolean }) {
  const w = WORLDS[world];
  const stops = dark ? w.bgDark : w.bgLight;
  const pts = gradientPoints(w.bgAngle);
  return (
    <LinearGradient
      colors={stops}
      locations={[0, 0.52, 1]}
      start={pts.start}
      end={pts.end}
      style={StyleSheet.absoluteFill}
    />
  );
}

interface Reveal {
  world: Mode;
  key: number;
  withMotion: boolean;
}

/**
 * AmbientMorph port: the incoming world wipes over the settled one in a
 * liquid circular reveal from the toggle origin — 780ms,
 * cubic-bezier(0.62,0.02,0.16,1). Crossfade fallback under reduce-motion.
 */
export function WorldBackground() {
  const { world, dark, motion } = useTheme();
  const { width: SW, height: SH } = useWindowDimensions();
  const [base, setBase] = useState<Mode>(world);
  const [reveal, setReveal] = useState<Reveal | null>(null);
  const prev = useRef(world);

  const scale = useSharedValue(0);
  const fade = useSharedValue(0);
  const sheen = useSharedValue(0);

  const settle = useCallback((w: Mode) => {
    setBase(w);
    setReveal(null);
  }, []);

  useEffect(() => {
    if (world === prev.current) return;
    prev.current = world;
    setReveal({ world, key: Date.now(), withMotion: motion });
    if (motion) {
      scale.value = 0;
      sheen.value = 0;
      scale.value = withTiming(
        1,
        { duration: 780, easing: Easing.bezier(0.62, 0.02, 0.16, 1) },
        (finished) => {
          if (finished) runOnJS(settle)(world);
        },
      );
      sheen.value = withTiming(1, { duration: 780, easing: Easing.out(Easing.ease) });
    } else {
      fade.value = 0;
      fade.value = withTiming(1, { duration: 250 }, (finished) => {
        if (finished) runOnJS(settle)(world);
      });
    }
    // safety: always settle even if the animation callback is missed
    const t = setTimeout(() => settle(world), 950);
    return () => clearTimeout(t);
  }, [world, motion, scale, fade, sheen, settle]);

  const R = Math.sqrt(SW * SW + SH * SH) + 80;
  const o = reveal
    ? { x: ORIGIN[reveal.world].x * (SW / 402), y: ORIGIN[reveal.world].y * (SH / 874) }
    : { x: 0, y: 0 };

  const maskStyle = useAnimatedStyle(() => ({
    transform: [{ scale: Math.max(scale.value, 0.0001) }],
  }));
  // prototype worldReveal also eases an overall 1.12 → 1 settle by 60%
  const innerStyle = useAnimatedStyle(() => {
    const p = Math.min(scale.value / 0.6, 1);
    return { transform: [{ scale: 1.12 - 0.12 * p }] };
  });
  const fadeStyle = useAnimatedStyle(() => ({ opacity: fade.value }));
  const sheenStyle = useAnimatedStyle(() => {
    const t = sheen.value;
    return {
      opacity: t < 0.35 ? t / 0.35 : Math.max(0, 1 - (t - 0.35) / 0.65),
      transform: [{ scale: 0.2 + 2.4 * t }],
    };
  });

  const sheenSize = SW * 1.2;

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]}>
      <WorldLayer world={base} dark={dark} />
      {reveal && reveal.withMotion && (
        <Animated.View
          key={reveal.key}
          style={[
            {
              position: 'absolute',
              left: o.x - R,
              top: o.y - R,
              width: 2 * R,
              height: 2 * R,
              borderRadius: R,
              overflow: 'hidden',
            },
            maskStyle,
          ]}
        >
          <Animated.View
            style={[
              { position: 'absolute', left: R - o.x, top: R - o.y, width: SW, height: SH },
              innerStyle,
            ]}
          >
            <WorldLayer world={reveal.world} dark={dark} />
          </Animated.View>
        </Animated.View>
      )}
      {reveal && !reveal.withMotion && (
        <Animated.View key={reveal.key} style={[StyleSheet.absoluteFill, fadeStyle]}>
          <WorldLayer world={reveal.world} dark={dark} />
        </Animated.View>
      )}
      {reveal && reveal.withMotion && (
        <Animated.View
          key={`sheen-${reveal.key}`}
          style={[
            {
              position: 'absolute',
              left: o.x - sheenSize / 2,
              top: o.y - sheenSize / 2,
              width: sheenSize,
              height: sheenSize,
            },
            sheenStyle,
          ]}
        >
          <Svg width="100%" height="100%" viewBox="0 0 100 100">
            <Defs>
              <RadialGradient id="revealSheen" cx="50%" cy="50%" r="50%">
                <Stop offset="0%" stopColor="#ffffff" stopOpacity={0.45} />
                <Stop offset="42%" stopColor="#ffffff" stopOpacity={0} />
                <Stop offset="100%" stopColor="#ffffff" stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <Circle cx={50} cy={50} r={50} fill="url(#revealSheen)" />
          </Svg>
        </Animated.View>
      )}
    </View>
  );
}
