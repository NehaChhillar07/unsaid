import React from 'react';
import { View } from 'react-native';
import { GradientCard } from '../GradientCard';
import { useTheme } from '../../theme/ThemeContext';

/** Decorative card silhouette behind the deck — pure visual depth. */
export function DeckCard({ depth }: { depth: number }) {
  const { world, dark } = useTheme();
  return (
    <GradientCard
      id={`${world}-deck-${depth}`}
      style={{
        width: '100%',
        borderRadius: 26,
        paddingTop: 22,
        paddingHorizontal: 22,
        paddingBottom: 18,
        shadowColor: dark ? '#000' : '#3B332B',
        shadowOffset: { width: 0, height: dark ? 16 : 12 },
        shadowRadius: dark ? 18 : 15,
        shadowOpacity: dark ? 0.28 : 0.1,
      }}
    >
      <View style={{ height: 28 }} />
      <View style={{ minHeight: 168, paddingVertical: 16 }} />
      <View style={{ height: 24 }} />
      <View style={{ height: 70 }} />
    </GradientCard>
  );
}
