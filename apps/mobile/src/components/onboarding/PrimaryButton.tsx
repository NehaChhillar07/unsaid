import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import * as Haptics from 'expo-haptics';
import { UI } from '../../theme/fonts';
import { useTheme } from '../../theme/ThemeContext';
import { useOnboardingInk } from './Shell';

interface PrimaryButtonProps {
  label: string;
  enabled?: boolean;
  onPress: () => void;
}

export function PrimaryButton({ label, enabled = true, onPress }: PrimaryButtonProps) {
  const { dark } = useTheme();
  const { ink, inkSoft } = useOnboardingInk();
  return (
    <Pressable
      onPress={() => {
        if (!enabled) return;
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      style={({ pressed }) => [
        styles.btn,
        {
          backgroundColor: enabled
            ? ink
            : dark
              ? 'rgba(247,228,236,0.18)'
              : 'rgba(59,51,43,0.18)',
          transform: [{ scale: pressed && enabled ? 0.975 : 1 }],
          shadowOpacity: enabled ? 0.22 : 0,
        },
      ]}
    >
      <Text
        style={[
          styles.label,
          { color: enabled ? (dark ? '#2d1a26' : '#fff') : inkSoft },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: '100%',
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#3B332B',
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 14,
  },
  label: {
    fontFamily: UI.semibold,
    fontSize: 16.5,
    letterSpacing: 16.5 * 0.01,
  },
});
