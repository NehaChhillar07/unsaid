import React from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { cardGradient } from '@unsaid/tokens';
import { gradientPoints } from '../theme/colors';
import { useTheme } from '../theme/ThemeContext';

interface GradientCardProps {
  /** id used to deterministically pick the gradient from the world family */
  id: string;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

/** Card wrapper painted with cardGradient() from @unsaid/tokens. */
export function GradientCard({ id, style, children }: GradientCardProps) {
  const { world, dark } = useTheme();
  const g = cardGradient(world, id, dark);
  const pts = gradientPoints(g.angle);
  return (
    <LinearGradient
      colors={g.colors}
      start={pts.start}
      end={pts.end}
      style={[{ borderRadius: 26 }, style]}
    >
      {children}
    </LinearGradient>
  );
}
