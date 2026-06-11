import React from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { MaskIcon } from './MaskIcon';
import { UI } from '../theme/fonts';

interface RoleBadgeProps {
  role: string;
  color?: string;
  bg?: string;
  style?: StyleProp<ViewStyle>;
}

export function RoleBadge({
  role,
  color = '#fff',
  bg = 'rgba(255,255,255,0.45)',
  style,
}: RoleBadgeProps) {
  return (
    <View style={[styles.badge, { backgroundColor: bg }, style]}>
      <MaskIcon size={13} color={color} />
      <Text numberOfLines={1} style={[styles.label, { color }]}>
        {role}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 5,
    paddingLeft: 9,
    paddingRight: 11,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  label: {
    fontFamily: UI.medium,
    fontSize: 12.5,
    letterSpacing: 12.5 * 0.01,
    flexShrink: 1,
  },
});
