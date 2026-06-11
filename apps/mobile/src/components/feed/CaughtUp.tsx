import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { SERIF, UI } from '../../theme/fonts';
import { useTheme } from '../../theme/ThemeContext';

function Cloud({ index, motion }: { index: number; motion: boolean }) {
  const t = useSharedValue(0);
  useEffect(() => {
    if (!motion) return;
    t.value = withDelay(
      index * 1000,
      withRepeat(
        withTiming(1, { duration: (7 + index * 2) * 1000, easing: Easing.inOut(Easing.ease) }),
        -1,
        true,
      ),
    );
  }, [index, motion, t]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: t.value * 14 }, { translateY: t.value * -10 }],
  }));

  const left = [10, 70, 40][index];
  const top = [10, 0, 44][index];

  return (
    <Animated.View style={[{ position: 'absolute', left, top, opacity: 0.85 }, style]}>
      <Text style={{ fontSize: 40 + index * 8 }}>☁️</Text>
    </Animated.View>
  );
}

export function CaughtUp({ onRestart }: { onRestart: () => void }) {
  const { dark, motion, ink } = useTheme();
  return (
    <View style={styles.wrap}>
      <View style={styles.clouds}>
        {[0, 1, 2].map((i) => (
          <Cloud key={i} index={i} motion={motion} />
        ))}
      </View>
      <Text style={[styles.title, { color: ink }]}>you've felt everything for now 🤍</Text>
      <Text
        style={[
          styles.sub,
          { color: dark ? 'rgba(255,255,255,0.6)' : 'rgba(59,51,43,0.6)' },
        ]}
      >
        come back later — there's always more left unsaid
      </Text>
      <Pressable
        onPress={onRestart}
        style={({ pressed }) => [
          styles.btn,
          {
            backgroundColor: dark ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.6)',
            transform: [{ scale: pressed ? 0.97 : 1 }],
          },
        ]}
      >
        <Text style={{ fontFamily: UI.semibold, fontSize: 14.5, color: ink }}>
          feel them again
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
  },
  clouds: { position: 'relative', width: 140, height: 90, marginBottom: 28 },
  title: {
    fontFamily: SERIF.italic,
    fontSize: 24,
    lineHeight: 24 * 1.4,
    textAlign: 'center',
    marginBottom: 10,
  },
  sub: {
    fontFamily: UI.regular,
    fontSize: 14.5,
    textAlign: 'center',
    marginBottom: 26,
  },
  btn: {
    paddingVertical: 13,
    paddingHorizontal: 24,
    borderRadius: 16,
  },
});
