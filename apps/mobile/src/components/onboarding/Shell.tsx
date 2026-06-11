import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { WORLDS } from '@unsaid/tokens';
import { gradientPoints } from '../../theme/colors';
import { useTheme } from '../../theme/ThemeContext';

export const ONBOARDING_ACCENT = '#B06A48';

export function useOnboardingInk() {
  const { dark } = useTheme();
  return {
    ink: dark ? '#F7E4EC' : '#3B332B',
    inkSoft: dark ? 'rgba(247,228,236,0.66)' : 'rgba(59,51,43,0.6)',
    accent: ONBOARDING_ACCENT,
  };
}

function Orb({ size, style }: { size: number; style: object }) {
  return (
    <View pointerEvents="none" style={[{ position: 'absolute', width: size, height: size }, style]}>
      <Svg width="100%" height="100%" viewBox="0 0 100 100">
        <Defs>
          <RadialGradient id="orb" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#ffffff" stopOpacity={0.5} />
            <Stop offset="70%" stopColor="#ffffff" stopOpacity={0} />
            <Stop offset="100%" stopColor="#ffffff" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={50} cy={50} r={50} fill="url(#orb)" />
      </Svg>
    </View>
  );
}

/** Warm personal-world backdrop with drifting soft orbs (onboarding only). */
export function OnboardingShell({ children }: { children: React.ReactNode }) {
  const { dark } = useTheme();
  const w = WORLDS.personal;
  const stops = dark ? w.bgDark : w.bgLight;
  const pts = gradientPoints(w.bgAngle);
  return (
    <View style={styles.fill}>
      <LinearGradient
        colors={stops}
        locations={[0, 0.52, 1]}
        start={pts.start}
        end={pts.end}
        style={StyleSheet.absoluteFill}
      />
      <Orb size={200} style={{ top: -60, right: -40 }} />
      <Orb size={160} style={{ bottom: 120, left: -50 }} />
      {children}
    </View>
  );
}

/** Step dots: 1 auth · 2 roles · 3 topics. Active dot widens to 22. */
export function StepDots({ step }: { step: 1 | 2 | 3 }) {
  const { dark, motion } = useTheme();
  return (
    <View style={styles.dots}>
      {([1, 2, 3] as const).map((i) => (
        <Dot key={i} active={i === step} dark={dark} motion={motion} />
      ))}
    </View>
  );
}

function Dot({ active, dark, motion }: { active: boolean; dark: boolean; motion: boolean }) {
  const width = useSharedValue(active ? 22 : 7);
  useEffect(() => {
    width.value = motion ? withTiming(active ? 22 : 7, { duration: 300 }) : active ? 22 : 7;
  }, [active, motion, width]);
  const style = useAnimatedStyle(() => ({ width: width.value }));
  return (
    <Animated.View
      style={[
        styles.dot,
        {
          backgroundColor: active
            ? ONBOARDING_ACCENT
            : dark
              ? 'rgba(247,228,236,0.25)'
              : 'rgba(59,51,43,0.2)',
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  dots: {
    flexDirection: 'row',
    gap: 7,
    justifyContent: 'center',
    marginBottom: 18,
  },
  dot: { height: 7, borderRadius: 999 },
});
