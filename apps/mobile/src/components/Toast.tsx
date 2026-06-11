import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { UI } from '../theme/fonts';
import { useTheme } from '../theme/ThemeContext';

interface ToastProps {
  message: string | null;
  /** distance from the top of the host container */
  top?: number;
}

/** Transient pill toast ("N fresh drops added 🤍", kind rejections, …). */
export function Toast({ message, top = 18 }: ToastProps) {
  const { dark, ink, motion } = useTheme();
  const visible = useSharedValue(0);

  useEffect(() => {
    const target = message ? 1 : 0;
    visible.value = motion
      ? withTiming(target, { duration: 350, easing: Easing.bezier(0.16, 1, 0.3, 1) })
      : target;
  }, [message, motion, visible]);

  const style = useAnimatedStyle(() => ({
    opacity: visible.value,
    transform: [{ translateY: (1 - visible.value) * -10 }],
  }));

  return (
    <View pointerEvents="none" style={[styles.host, { top }]}>
      <Animated.View style={style}>
        {message != null && (
          <View
            style={[
              styles.pill,
              { backgroundColor: dark ? 'rgba(70,62,58,0.96)' : '#fff' },
            ]}
          >
            <Text style={[styles.text, { color: ink }]}>{message}</Text>
          </View>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 60,
  },
  pill: {
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 11,
    shadowOpacity: 0.14,
    elevation: 6,
  },
  text: { fontFamily: UI.semibold, fontSize: 13 },
});
