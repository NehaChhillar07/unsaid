import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { TOPICS, type TopicId } from '@unsaid/tokens';
import { ensureProfile, upsertIdentity } from '@unsaid/api';
import { supabase } from '../../src/lib/supabase';
import { track, captureError } from '../../src/lib/analytics';
import { useAuth } from '../../src/state/AuthContext';
import {
  OnboardingShell,
  StepDots,
  useOnboardingInk,
} from '../../src/components/onboarding/Shell';
import { PrimaryButton } from '../../src/components/onboarding/PrimaryButton';
import { UI } from '../../src/theme/fonts';
import { useTheme } from '../../src/theme/ThemeContext';

/** Step 3 — what's been heavy? (pick ≥3 topics, then the feed). */
export default function Topics() {
  const router = useRouter();
  const { dark } = useTheme();
  const { ink, inkSoft } = useOnboardingInk();
  const insets = useSafeAreaInsets();
  const { markOnboarded } = useAuth();
  const params = useLocalSearchParams<{ personal?: string; professional?: string }>();

  const [picked, setPicked] = useState<TopicId[]>([]);
  const [busy, setBusy] = useState(false);

  const toggle = (id: TopicId) => {
    void Haptics.selectionAsync();
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  };

  const done = async () => {
    if (picked.length < 3 || busy) return;
    setBusy(true);
    try {
      const personal = (params.personal ?? '').trim() || 'someone, somewhere';
      const professional = (params.professional ?? '').trim() || 'someone at work';
      await ensureProfile(supabase);
      await upsertIdentity(supabase, 'personal', personal, picked);
      await upsertIdentity(supabase, 'professional', professional, picked);
      await markOnboarded();
      track('onboarding_complete', { topics: picked.length });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/(tabs)');
    } catch (e) {
      captureError(e);
      Alert.alert(
        'that didn’t save',
        'the quiet room didn’t answer — check your connection and try again 🤍',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <OnboardingShell>
      <View style={[styles.sheet, { paddingTop: insets.top + 70 }]}>
        <StepDots step={3} />
        <Text style={[styles.title, { color: ink }]}>what's been heavy?</Text>
        <Text style={[styles.sub, { color: inkSoft }]}>
          pick a few to seed your feed. you'll see people who get it.
        </Text>
        <View style={styles.chips}>
          {TOPICS.map((t) => {
            const on = picked.includes(t.id);
            return (
              <Pressable
                key={t.id}
                onPress={() => toggle(t.id)}
                style={[
                  styles.chip,
                  on
                    ? { backgroundColor: ink, borderColor: 'transparent' }
                    : {
                        backgroundColor: dark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.5)',
                        borderColor: dark ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.8)',
                      },
                ]}
              >
                <Text style={{ fontSize: 15 }}>{t.glyph}</Text>
                <Text
                  style={{
                    fontFamily: UI.medium,
                    fontSize: 14.5,
                    color: on ? (dark ? '#2d1a26' : '#fff') : ink,
                  }}
                >
                  {t.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <View style={{ flex: 1 }} />
        <Text style={[styles.counter, { color: inkSoft }]}>
          {picked.length < 3
            ? `pick ${3 - picked.length} more`
            : 'a feed is already waiting for you'}
        </Text>
        <View style={{ marginBottom: Math.max(insets.bottom, 20) + 20 }}>
          <PrimaryButton
            label={busy ? 'opening the feed…' : 'start feeling'}
            enabled={picked.length >= 3 && !busy}
            onPress={() => void done()}
          />
        </View>
      </View>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  sheet: { flex: 1, paddingHorizontal: 28 },
  title: {
    fontFamily: UI.bold,
    fontSize: 28,
    letterSpacing: 28 * -0.02,
    marginBottom: 8,
  },
  sub: {
    fontFamily: UI.regular,
    fontSize: 15,
    lineHeight: 15 * 1.5,
    marginBottom: 22,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1.5,
  },
  counter: {
    marginBottom: 10,
    textAlign: 'center',
    fontFamily: UI.regular,
    fontSize: 12.5,
  },
});
