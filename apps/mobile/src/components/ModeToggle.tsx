import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import type { Mode } from '@unsaid/tokens';
import { UI } from '../theme/fonts';
import { useTheme } from '../theme/ThemeContext';

const OPTS: { key: Mode; label: string; dot: string }[] = [
  { key: 'personal', label: 'personal', dot: '#B06A48' },
  { key: 'professional', label: 'professional', dot: '#5A7388' },
];

/** The signature warm↔cool sliding switch. 560ms cubic-bezier(0.34,1.32,0.46,1). */
export function ModeToggle() {
  const { world, setWorld, dark, motion } = useTheme();
  const [width, setWidth] = useState(0);
  const p = useSharedValue(world === 'personal' ? 0 : 1);

  useEffect(() => {
    const target = world === 'personal' ? 0 : 1;
    p.value = motion
      ? withTiming(target, { duration: 560, easing: Easing.bezier(0.34, 1.32, 0.46, 1) })
      : target;
  }, [world, motion, p]);

  // thumb sits at x=4 (personal) → x=width/2 (professional); distance = width/2 - 4
  const thumbWidth = Math.max(0, width / 2 - 4);
  const slideStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: p.value * thumbWidth }],
  }));

  const ink = dark ? '#fff' : world === 'personal' ? '#3B332B' : '#2B333B';

  const onPick = (key: Mode) => {
    if (key === world) return;
    void Haptics.selectionAsync();
    setWorld(key);
  };

  return (
    <View
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={[
        styles.container,
        {
          backgroundColor: dark ? 'rgba(255,255,255,0.13)' : 'rgba(255,255,255,0.5)',
          borderColor: dark ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.8)',
        },
      ]}
    >
      {width > 0 && (
        <Animated.View
          style={[
            styles.thumb,
            {
              width: thumbWidth,
              backgroundColor: dark ? 'rgba(255,255,255,0.24)' : '#fff',
            },
            slideStyle,
          ]}
        />
      )}
      {OPTS.map((o) => {
        const active = world === o.key;
        return (
          <Pressable key={o.key} onPress={() => onPick(o.key)} style={styles.option}>
            <View style={[styles.dot, { backgroundColor: o.dot, opacity: active ? 1 : 0.5 }]} />
            <Text
              style={{
                fontFamily: active ? UI.bold : UI.medium,
                fontSize: 13.5,
                color: active
                  ? ink
                  : dark
                    ? 'rgba(255,255,255,0.62)'
                    : 'rgba(59,51,43,0.45)',
              }}
            >
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 999,
    borderWidth: 1,
    alignSelf: 'flex-start',
    shadowColor: '#3B332B',
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    shadowOpacity: 0.1,
  },
  thumb: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    left: 4,
    borderRadius: 999,
    shadowColor: '#3B332B',
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    shadowOpacity: 0.14,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 999,
  },
  dot: { width: 7, height: 7, borderRadius: 999 },
});
