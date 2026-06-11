import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Linking from 'expo-linking';
import * as Haptics from 'expo-haptics';
import { supabase } from '../../src/lib/supabase';
import { track } from '../../src/lib/analytics';
import { useAuth } from '../../src/state/AuthContext';
import {
  OnboardingShell,
  StepDots,
  useOnboardingInk,
} from '../../src/components/onboarding/Shell';
import { PrimaryButton } from '../../src/components/onboarding/PrimaryButton';
import { UI } from '../../src/theme/fonts';
import { useTheme } from '../../src/theme/ThemeContext';

type Phase = 'options' | 'email' | 'sent';

/** Step 1 — auth: apple (disabled until the app store build) + email magic link. */
export default function Auth() {
  const router = useRouter();
  const { dark } = useTheme();
  const { ink, inkSoft } = useOnboardingInk();
  const insets = useSafeAreaInsets();
  const { session, ready, onboarded } = useAuth();

  const [phase, setPhase] = useState<Phase>('options');
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigated = useRef(false);

  // magic-link return: session appears → continue to roles (gate handles
  // the already-onboarded case by replacing to the feed).
  useEffect(() => {
    if (!ready || !session || navigated.current) return;
    navigated.current = true;
    if (!onboarded) router.replace('/(onboarding)/roles');
  }, [ready, session, onboarded, router]);

  const sendLink = async () => {
    const addr = email.trim().toLowerCase();
    if (!addr || sending) return;
    setSending(true);
    setError(null);
    try {
      const { error: err } = await supabase.auth.signInWithOtp({
        email: addr,
        options: { emailRedirectTo: Linking.createURL('auth') },
      });
      if (err) {
        setError("that didn't work — check the address and try again 🤍");
      } else {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        track('magic_link_sent');
        setPhase('sent');
      }
    } catch {
      setError("couldn't reach the quiet room — try again in a moment 🤍");
    } finally {
      setSending(false);
    }
  };

  const optionBtn = (
    label: string,
    onPress: (() => void) | null,
    primary = false,
    note?: string,
  ) => (
    <View key={label}>
      <Pressable
        onPress={onPress ?? undefined}
        disabled={!onPress}
        style={({ pressed }) => [
          styles.option,
          primary
            ? { backgroundColor: ink, opacity: onPress ? 1 : 0.45 }
            : {
                backgroundColor: dark ? 'rgba(255,255,255,0.09)' : 'rgba(255,255,255,0.55)',
                borderWidth: 1.5,
                borderColor: dark ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.8)',
              },
          pressed && onPress ? { transform: [{ scale: 0.985 }] } : null,
        ]}
      >
        <Text
          style={{
            fontFamily: UI.semibold,
            fontSize: 16,
            color: primary ? (dark ? '#2d1a26' : '#fff') : ink,
          }}
        >
          {label}
        </Text>
      </Pressable>
      {note ? (
        <Text style={[styles.note, { color: inkSoft }]}>{note}</Text>
      ) : null}
    </View>
  );

  return (
    <OnboardingShell>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <View style={[styles.sheet, { paddingTop: insets.top + 70 }]}>
          <StepDots step={1} />
          <Text style={[styles.title, { color: ink }]}>get in quietly</Text>
          <Text style={[styles.sub, { color: inkSoft }]}>
            we never ask for your real name. sign-in just keeps your two selves yours.
          </Text>

          {phase === 'options' && (
            <View style={{ gap: 12, flex: 1 }}>
              {optionBtn(
                'continue with apple',
                null,
                true,
                'coming with the app store build',
              )}
              {optionBtn('email magic link', () => setPhase('email'))}
            </View>
          )}

          {phase === 'email' && (
            <View style={{ gap: 12, flex: 1 }}>
              <View
                style={[
                  styles.field,
                  {
                    backgroundColor: dark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.55)',
                    borderColor: dark ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.8)',
                  },
                ]}
              >
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="your@email.com"
                  placeholderTextColor={inkSoft}
                  autoCapitalize="none"
                  autoComplete="email"
                  keyboardType="email-address"
                  autoFocus
                  style={[styles.input, { color: ink }]}
                  onSubmitEditing={() => void sendLink()}
                  returnKeyType="send"
                />
                {sending && <ActivityIndicator size="small" color={ink} />}
              </View>
              {error ? (
                <Text style={{ fontFamily: UI.regular, fontSize: 12.5, color: '#D9694C' }}>
                  {error}
                </Text>
              ) : null}
              <PrimaryButton
                label="send the link"
                enabled={!!email.trim() && !sending}
                onPress={() => void sendLink()}
              />
              <Pressable onPress={() => setPhase('options')} style={{ alignSelf: 'center' }}>
                <Text style={{ fontFamily: UI.regular, fontSize: 13.5, color: inkSoft }}>
                  back
                </Text>
              </Pressable>
            </View>
          )}

          {phase === 'sent' && (
            <View style={{ flex: 1, gap: 10, paddingTop: 20 }}>
              <Text style={{ fontSize: 34 }}>🤍</Text>
              <Text style={{ fontFamily: UI.bold, fontSize: 22, color: ink }}>
                check your inbox 🤍
              </Text>
              <Text style={{ fontFamily: UI.regular, fontSize: 14.5, lineHeight: 21, color: inkSoft }}>
                we sent a quiet little link to {email.trim().toLowerCase()}. tap it on this phone
                and you're in — no password, no name.
              </Text>
              <Pressable onPress={() => setPhase('email')} style={{ marginTop: 8 }}>
                <Text style={{ fontFamily: UI.medium, fontSize: 13.5, color: inkSoft }}>
                  wrong address? send it again
                </Text>
              </Pressable>
            </View>
          )}

          <Text style={[styles.legal, { color: inkSoft, marginBottom: Math.max(insets.bottom, 20) + 12 }]}>
            anonymous to other users. we keep the bare minimum to stop abuse — and we say exactly
            what, in plain words.
          </Text>
        </View>
      </KeyboardAvoidingView>
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
    marginBottom: 28,
  },
  option: {
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  note: {
    fontFamily: UI.regular,
    fontSize: 11.5,
    textAlign: 'center',
    marginTop: 6,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 54,
    borderRadius: 16,
    borderWidth: 1.5,
    paddingHorizontal: 14,
  },
  input: { flex: 1, fontFamily: UI.regular, fontSize: 15.5 },
  legal: {
    textAlign: 'center',
    fontFamily: UI.regular,
    fontSize: 12,
    lineHeight: 12 * 1.5,
  },
});
