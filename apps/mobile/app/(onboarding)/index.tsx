import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaskIcon } from '../../src/components/MaskIcon';
import {
  OnboardingShell,
  useOnboardingInk,
} from '../../src/components/onboarding/Shell';
import { PrimaryButton } from '../../src/components/onboarding/PrimaryButton';
import { SERIF, UI } from '../../src/theme/fonts';
import { useTheme } from '../../src/theme/ThemeContext';

/** Step 0 — splash. */
export default function Splash() {
  const router = useRouter();
  const { dark } = useTheme();
  const { ink, inkSoft, accent } = useOnboardingInk();
  const insets = useSafeAreaInsets();

  return (
    <OnboardingShell>
      <View style={[styles.sheet, { paddingTop: insets.top + 60 }]}>
        <View style={{ marginBottom: 26 }}>
          <View
            style={[
              styles.logoTile,
              { backgroundColor: dark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.6)' },
            ]}
          >
            <MaskIcon size={32} color={accent} />
          </View>
          <Text
            style={{
              fontFamily: UI.bold,
              fontSize: 52,
              letterSpacing: 52 * -0.03,
              color: ink,
              lineHeight: 52,
            }}
          >
            unsaid
          </Text>
        </View>
        <Text style={[styles.tagline, { color: ink }]}>say the thing you've never said.</Text>
        <Text style={{ fontFamily: UI.regular, fontSize: 15, color: inkSoft }}>
          nobody knows it's you. everybody feels it.
        </Text>
        <View style={[styles.bottom, { bottom: Math.max(insets.bottom, 26) + 30 }]}>
          <PrimaryButton
            label="spill your first feeling"
            onPress={() => router.push('/(onboarding)/auth')}
          />
          <Text style={[styles.footnote, { color: inkSoft }]}>
            your secret's safe — no name, ever
          </Text>
        </View>
      </View>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  sheet: {
    flex: 1,
    paddingHorizontal: 30,
    justifyContent: 'center',
  },
  logoTile: {
    width: 62,
    height: 62,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
    shadowColor: '#3B332B',
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 11,
    shadowOpacity: 0.16,
  },
  tagline: {
    fontFamily: SERIF.italic,
    fontSize: 23,
    lineHeight: 23 * 1.45,
    marginBottom: 14,
    maxWidth: 300,
  },
  bottom: {
    position: 'absolute',
    left: 30,
    right: 30,
  },
  footnote: {
    textAlign: 'center',
    marginTop: 16,
    fontFamily: UI.regular,
    fontSize: 13,
  },
});
