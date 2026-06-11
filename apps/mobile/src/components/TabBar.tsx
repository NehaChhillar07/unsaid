import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { UI } from '../theme/fonts';
import { useTheme } from '../theme/ThemeContext';
import { useFreshDrops } from '../state/FreshDropsContext';

const SW = 2.1;

function TabIcon({ name, color }: { name: 'feel' | 'notif' | 'you'; color: string }) {
  if (name === 'feel') {
    return (
      <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
        <Rect x={4} y={6} width={16} height={13} rx={3.5} stroke={color} strokeWidth={SW} />
        <Path d="M7 3.5h10" stroke={color} strokeWidth={SW} strokeLinecap="round" />
      </Svg>
    );
  }
  if (name === 'notif') {
    return (
      <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
        <Path
          d="M6 9a6 6 0 1112 0c0 4 1.4 5.4 2 6H4c.6-.6 2-2 2-6Z"
          stroke={color}
          strokeWidth={SW}
          strokeLinejoin="round"
        />
        <Path d="M10 19a2 2 0 004 0" stroke={color} strokeWidth={SW} strokeLinecap="round" />
      </Svg>
    );
  }
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={8.5} r={3.6} stroke={color} strokeWidth={SW} />
      <Path
        d="M5.5 19.5c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6"
        stroke={color}
        strokeWidth={SW}
        strokeLinecap="round"
      />
    </Svg>
  );
}

const TAB_META: Record<string, { icon: 'feel' | 'notif' | 'you'; label: string }> = {
  index: { icon: 'feel', label: 'feel' },
  notifications: { icon: 'notif', label: 'felt' },
  you: { icon: 'you', label: 'you' },
};

/** Custom tab bar — 3 items + the prominent 62px gradient spill button. */
export function TabBar({ state, navigation }: BottomTabBarProps) {
  const { world, dark, w } = useTheme();
  const { count } = useFreshDrops();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const active = w.accent;
  const idle = dark ? 'rgba(255,255,255,0.62)' : 'rgba(59,51,43,0.42)';

  const item = (routeIndex: number) => {
    const route = state.routes[routeIndex];
    if (!route) return null;
    const meta = TAB_META[route.name];
    if (!meta) return null;
    const focused = state.index === routeIndex;
    const color = focused ? active : idle;
    const badge = route.name === 'index' ? count : 0;

    const onPress = () => {
      void Haptics.selectionAsync();
      const event = navigation.emit({
        type: 'tabPress',
        target: route.key,
        canPreventDefault: true,
      });
      if (!focused && !event.defaultPrevented) {
        navigation.navigate(route.name);
      }
    };

    return (
      <Pressable key={route.key} onPress={onPress} style={styles.item}>
        <View>
          <TabIcon name={meta.icon} color={color} />
          {badge > 0 && (
            <View style={[styles.badge, { backgroundColor: active }]}>
              <Text style={styles.badgeText}>{badge > 9 ? '9+' : badge}</Text>
            </View>
          )}
        </View>
        <Text
          style={{
            fontFamily: focused ? UI.semibold : UI.medium,
            fontSize: 10.5,
            color,
          }}
        >
          {meta.label}
        </Text>
      </Pressable>
    );
  };

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 26) }]}>
      <LinearGradient
        colors={[
          'transparent',
          dark ? 'rgba(20,12,18,0.9)' : 'rgba(255,255,255,0.55)',
        ]}
        style={StyleSheet.absoluteFill}
      />
      {item(0)}
      <Pressable
        onPress={() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          router.push('/compose');
        }}
        style={({ pressed }) => [
          styles.spill,
          { shadowColor: w.accent, transform: [{ translateY: -12 }, { scale: pressed ? 0.92 : 1 }] },
        ]}
        accessibilityLabel="spill a feeling"
      >
        <LinearGradient
          colors={[w.accent, world === 'personal' ? '#9C5A3C' : '#43586B']}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={styles.spillInner}
        >
          <Svg width={26} height={26} viewBox="0 0 24 24" fill="none">
            <Path
              d="M14 4l6 6M3 21l1.2-4.2L15 6l3 3L7.2 19.8 3 21Z"
              stroke="#fff"
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </Svg>
        </LinearGradient>
      </Pressable>
      {item(1)}
      {item(2)}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 6,
    paddingHorizontal: 18,
    gap: 4,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
    paddingVertical: 8,
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -8,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 4,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 3,
    shadowOpacity: 0.2,
  },
  badgeText: {
    fontFamily: UI.bold,
    fontSize: 10,
    color: '#fff',
  },
  spill: {
    marginHorizontal: 6,
    flexShrink: 0,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 13,
    shadowOpacity: 0.4,
  },
  spillInner: {
    width: 62,
    height: 62,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
