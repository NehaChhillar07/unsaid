import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MOODS, type MoodKey } from '@unsaid/tokens';
import { UI } from '../theme/fonts';

export function MoodChip({ mood, dark = false }: { mood: MoodKey | null; dark?: boolean }) {
  if (!mood) return null;
  const m = MOODS[mood];
  if (!m) return null;
  return (
    <View style={[styles.chip, { backgroundColor: `${m.tint}${dark ? '33' : '26'}` }]}>
      <View style={[styles.dot, { backgroundColor: m.tint }]} />
      <Text style={[styles.label, { color: dark ? '#fff' : m.tint }]}>{m.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  dot: { width: 6, height: 6, borderRadius: 999 },
  label: { fontFamily: UI.medium, fontSize: 11.5 },
});
