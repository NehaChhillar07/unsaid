import React from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, FadeIn, SlideInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HELPLINES } from '@unsaid/tokens';
import { SERIF, UI } from '../theme/fonts';
import { useTheme } from '../theme/ThemeContext';

interface CrisisSheetProps {
  onClose: () => void;
  onPostAnyway: () => void;
}

/** Compassionate crisis interstitial — never a pure auto-block. Exact prototype port. */
export function CrisisSheet({ onClose, onPostAnyway }: CrisisSheetProps) {
  const { dark, motion, w } = useTheme();
  const insets = useSafeAreaInsets();
  const bg = dark ? '#201D1A' : '#fff';
  const ink = dark ? '#fff' : '#332B24';
  const inkSoft = dark ? 'rgba(255,255,255,0.66)' : 'rgba(51,43,36,0.66)';

  return (
    <View style={[StyleSheet.absoluteFill, styles.host]}>
      <Animated.View
        entering={motion ? FadeIn.duration(250) : undefined}
        style={StyleSheet.absoluteFill}
      >
        <Pressable style={[StyleSheet.absoluteFill, styles.backdrop]} onPress={onClose} />
      </Animated.View>
      <Animated.View
        entering={
          motion
            ? SlideInDown.duration(400).easing(Easing.bezier(0.16, 1, 0.3, 1).factory())
            : undefined
        }
        style={[styles.sheet, { backgroundColor: bg, paddingBottom: Math.max(insets.bottom, 30) }]}
      >
        <Text style={{ fontSize: 30, marginBottom: 14 }}>🤍</Text>
        <Text style={[styles.headline, { color: ink }]}>
          it sounds like you're carrying something really heavy right now.
        </Text>
        <Text style={[styles.sub, { color: inkSoft }]}>
          you deserve someone real on the other end. these people are kind, free, and ready to
          listen — no judgement.
        </Text>
        <View style={{ gap: 8, marginBottom: 22 }}>
          {HELPLINES.map((l) => (
            <Pressable
              key={l.name}
              onPress={() => void Linking.openURL(`tel:${l.tel}`)}
              style={({ pressed }) => [
                styles.line,
                {
                  backgroundColor: dark ? 'rgba(255,255,255,0.06)' : '#F3EEE7',
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <View>
                <Text style={{ fontFamily: UI.semibold, fontSize: 15, color: ink }}>{l.name}</Text>
                <Text style={{ fontFamily: UI.regular, fontSize: 12.5, color: inkSoft }}>
                  {l.detail}
                </Text>
              </View>
              <Text style={{ fontSize: 18, color: ink }}>→</Text>
            </Pressable>
          ))}
        </View>
        <Pressable
          onPress={onClose}
          style={({ pressed }) => [
            styles.primary,
            { backgroundColor: w.accent, opacity: pressed ? 0.88 : 1 },
          ]}
        >
          <Text style={{ fontFamily: UI.semibold, fontSize: 15.5, color: '#fff' }}>
            talk to someone now
          </Text>
        </Pressable>
        <Pressable onPress={onPostAnyway} style={styles.secondary}>
          <Text style={{ fontFamily: UI.regular, fontSize: 14, color: inkSoft }}>
            it's just a feeling — release it anyway
          </Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: { justifyContent: 'flex-end', zIndex: 100 },
  backdrop: { backgroundColor: 'rgba(20,10,18,0.5)' },
  sheet: {
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 26,
    paddingTop: 28,
  },
  headline: {
    fontFamily: SERIF.regular,
    fontSize: 23,
    lineHeight: 23 * 1.4,
    marginBottom: 10,
  },
  sub: {
    fontFamily: UI.regular,
    fontSize: 14.5,
    lineHeight: 14.5 * 1.55,
    marginBottom: 20,
  },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  primary: {
    width: '100%',
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  secondary: {
    width: '100%',
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
