import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { ModeToggle } from './ModeToggle';
import { useTheme } from '../theme/ThemeContext';

/** Mode toggle + dark/light button, shown above every tab. */
export function TopBar() {
  const { dark, toggleDark } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.bar, { paddingTop: insets.top + 14 }]}>
      <ModeToggle />
      <Pressable
        onPress={() => {
          void Haptics.selectionAsync();
          toggleDark();
        }}
        style={[
          styles.darkBtn,
          { backgroundColor: dark ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.55)' },
        ]}
        accessibilityLabel={dark ? 'switch to light mode' : 'switch to dark mode'}
      >
        <Text style={{ fontSize: 16 }}>{dark ? '☀️' : '🌙'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingBottom: 10,
    zIndex: 10,
  },
  darkBtn: {
    width: 38,
    height: 38,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
