import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  SlideInDown,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import {
  MOODS,
  MOOD_LIST,
  POST_MAX_CHARS,
  type MoodKey,
} from '@unsaid/tokens';
import { fetchDraft, publish, saveDraft } from '@unsaid/api';
import { supabase } from '../src/lib/supabase';
import { track, captureError } from '../src/lib/analytics';
import { useTheme } from '../src/theme/ThemeContext';
import { useIdentities } from '../src/hooks/useIdentities';
import { RoleBadge } from '../src/components/RoleBadge';
import { CrisisSheet } from '../src/components/CrisisSheet';
import { SERIF, UI } from '../src/theme/fonts';

function PaperPlane({ ink }: { ink: string }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withTiming(1, { duration: 1000, easing: Easing.bezier(0.4, 0, 0.2, 1) });
  }, [t]);
  const planeStyle = useAnimatedStyle(() => ({
    opacity: t.value < 0.25 ? 1 : Math.max(0, 1 - (t.value - 0.25) / 0.75),
    transform: [
      { translateX: t.value * 110 },
      { translateY: t.value * -560 },
      { rotate: `${t.value * 26}deg` },
      { scale: 1 - t.value * 0.6 },
    ],
  }));
  const text = useSharedValue(0);
  useEffect(() => {
    text.value = withDelay(200, withTiming(1, { duration: 500 }));
  }, [text]);
  const textStyle = useAnimatedStyle(() => ({ opacity: text.value }));
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { zIndex: 95 }]}>
      <Animated.View style={[styles.plane, planeStyle]}>
        <Text style={{ fontSize: 44 }}>✈️</Text>
      </Animated.View>
      <Animated.View style={[styles.planeTextWrap, textStyle]}>
        <Text style={[styles.planeText, { color: ink }]}>released into the feed 🤍</Text>
      </Animated.View>
    </View>
  );
}

export default function ComposeModal() {
  const router = useRouter();
  const qc = useQueryClient();
  const insets = useSafeAreaInsets();
  const { world, dark, motion, w, ink, inkSoft, sheetBg } = useTheme();
  const identities = useIdentities();
  const role = identities.data?.find((i) => i.mode === world)?.role_title ?? '';

  const [text, setText] = useState('');
  const [mood, setMood] = useState<MoodKey | null>(null);
  const [commentsOn, setCommentsOn] = useState(true);
  const [crisis, setCrisis] = useState(false);
  const [flying, setFlying] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const loadedDraft = useRef(false);
  const draftTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // load the per-mode draft once
  useEffect(() => {
    let mounted = true;
    fetchDraft(supabase, world)
      .then((d) => {
        if (mounted && d && d.body) {
          setText(d.body);
          setMood(d.mood);
        }
      })
      .catch(() => {})
      .finally(() => {
        loadedDraft.current = true;
      });
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // debounced draft autosave (800ms)
  useEffect(() => {
    if (!loadedDraft.current) return;
    if (draftTimer.current) clearTimeout(draftTimer.current);
    draftTimer.current = setTimeout(() => {
      saveDraft(supabase, world, text, mood).catch(() => {});
      void qc.invalidateQueries({ queryKey: ['draft', world] });
    }, 800);
    return () => {
      if (draftTimer.current) clearTimeout(draftTimer.current);
    };
  }, [text, mood, world, qc]);

  const remaining = POST_MAX_CHARS - text.length;
  const over = remaining < 0;
  const canRelease = !!text.trim() && !over && !busy;

  const flash = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 2800);
  };

  const release = useCallback(
    async (acknowledged = false) => {
      if (!text.trim() || over || busy) return;
      setBusy(true);
      setCrisis(false);
      try {
        const res = await publish(supabase, {
          kind: 'post',
          mode: world,
          body: text.trim(),
          mood,
          comments_enabled: commentsOn,
          acknowledged_crisis: acknowledged,
        });
        if (res.verdict === 'published') {
          saveDraft(supabase, world, '', null).catch(() => {});
          void qc.invalidateQueries({ queryKey: ['feed', world] });
          void qc.invalidateQueries({ queryKey: ['own-posts', world] });
          void qc.invalidateQueries({ queryKey: ['draft', world] });
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          track('post_published', { mode: world, mood });
          if (motion) {
            setFlying(true);
            setTimeout(() => router.back(), 1100);
          } else {
            router.back();
          }
        } else if (res.verdict === 'crisis') {
          setCrisis(true);
        } else {
          flash(res.message ?? "this one can't go out as written — try softening it 🤍");
        }
      } catch (e) {
        captureError(e);
        flash('couldn’t release it — try again in a moment 🤍');
      } finally {
        setBusy(false);
      }
    },
    [text, over, busy, world, mood, commentsOn, motion, qc, router],
  );

  return (
    <View style={styles.host}>
      <Animated.View
        entering={motion ? FadeIn.duration(250) : undefined}
        style={StyleSheet.absoluteFill}
      >
        <Pressable style={[StyleSheet.absoluteFill, styles.backdrop]} onPress={() => router.back()} />
      </Animated.View>

      <Animated.View
        entering={
          motion
            ? SlideInDown.duration(400).easing(Easing.bezier(0.16, 1, 0.3, 1).factory())
            : undefined
        }
        style={[
          styles.sheet,
          {
            backgroundColor: sheetBg,
            marginTop: insets.top + 20,
            opacity: flying ? 0 : 1,
          },
        ]}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          {/* header */}
          <View style={styles.header}>
            <Pressable onPress={() => router.back()} hitSlop={10}>
              <Text style={{ fontFamily: UI.regular, fontSize: 14.5, color: inkSoft }}>cancel</Text>
            </Pressable>
            <Text style={{ fontFamily: UI.bold, fontSize: 15, color: ink }}>spill it</Text>
            <Pressable
              onPress={() => void release(false)}
              disabled={!canRelease}
              style={[
                styles.releaseBtn,
                {
                  backgroundColor: canRelease
                    ? w.accent
                    : dark
                      ? 'rgba(255,255,255,0.12)'
                      : 'rgba(59,51,43,0.12)',
                },
              ]}
            >
              <Text
                style={{
                  fontFamily: UI.bold,
                  fontSize: 13.5,
                  color: canRelease ? '#fff' : inkSoft,
                }}
              >
                release
              </Text>
            </Pressable>
          </View>

          {/* role context */}
          <View style={styles.roleRow}>
            <RoleBadge
              role={role || '…'}
              color={ink}
              bg={dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.04)'}
            />
            <Text style={{ fontFamily: UI.regular, fontSize: 12, color: inkSoft, marginLeft: 8 }}>
              posting to your {world} world
            </Text>
          </View>

          {notice && (
            <View
              style={[
                styles.notice,
                { backgroundColor: dark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.9)' },
              ]}
            >
              <Text style={{ fontFamily: UI.semibold, fontSize: 12.5, color: ink }}>{notice}</Text>
            </View>
          )}

          {/* textarea */}
          <TextInput
            value={text}
            onChangeText={setText}
            autoFocus
            multiline
            placeholder="say the thing you've never said…"
            placeholderTextColor={inkSoft}
            selectionColor={w.accent}
            style={[
              styles.textarea,
              { color: ink },
            ]}
          />

          {/* mood picker */}
          <Text style={{ fontFamily: UI.regular, fontSize: 12, color: inkSoft, marginTop: 6, marginBottom: 8 }}>
            how does it feel? (optional)
          </Text>
          <View style={styles.moods}>
            {MOOD_LIST.map((mk) => {
              const m = MOODS[mk];
              const on = mood === mk;
              return (
                <Pressable
                  key={mk}
                  onPress={() => {
                    void Haptics.selectionAsync();
                    setMood(on ? null : mk);
                  }}
                  style={[
                    styles.moodChip,
                    {
                      backgroundColor: on
                        ? `${m.tint}26`
                        : dark
                          ? 'rgba(255,255,255,0.07)'
                          : 'rgba(0,0,0,0.04)',
                      borderColor: on ? m.tint : 'transparent',
                    },
                  ]}
                >
                  <View style={[styles.moodDot, { backgroundColor: m.tint }]} />
                  <Text
                    style={{
                      fontFamily: UI.medium,
                      fontSize: 12.5,
                      color: on ? (dark ? '#fff' : m.tint) : inkSoft,
                    }}
                  >
                    {m.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* footer controls */}
          <View style={[styles.footerRow, { paddingBottom: Math.max(insets.bottom, 10) + 14 }]}>
            <Pressable
              onPress={() => {
                void Haptics.selectionAsync();
                setCommentsOn((v) => !v);
              }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
            >
              <View
                style={[
                  styles.toggleTrack,
                  {
                    backgroundColor: commentsOn
                      ? w.accent
                      : dark
                        ? 'rgba(255,255,255,0.2)'
                        : 'rgba(59,51,43,0.2)',
                  },
                ]}
              >
                <View
                  style={[
                    styles.toggleKnob,
                    { transform: [{ translateX: commentsOn ? 16 : 0 }] },
                  ]}
                />
              </View>
              <Text style={{ fontFamily: UI.regular, fontSize: 13, color: ink }}>replies on</Text>
            </Pressable>
            <Text
              style={{
                fontFamily: UI.semibold,
                fontSize: 13,
                fontVariant: ['tabular-nums'],
                color: over ? '#D9694C' : remaining < 60 ? w.accent : inkSoft,
              }}
            >
              {remaining}
            </Text>
          </View>
        </KeyboardAvoidingView>
      </Animated.View>

      {/* paper plane publish animation */}
      {flying && <PaperPlane ink={ink} />}

      {/* crisis interstitial */}
      {crisis && (
        <CrisisSheet
          onClose={() => setCrisis(false)}
          onPostAnyway={() => void release(true)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  host: { flex: 1 },
  backdrop: { backgroundColor: 'rgba(20,10,18,0.4)' },
  sheet: {
    flex: 1,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingTop: 14,
    paddingHorizontal: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -12 },
    shadowRadius: 22,
    shadowOpacity: 0.22,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  releaseBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 999,
  },
  roleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  notice: {
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    marginBottom: 8,
  },
  textarea: {
    flex: 1,
    fontFamily: SERIF.regular,
    fontSize: 22,
    lineHeight: 22 * 1.45,
    textAlignVertical: 'top',
  },
  moods: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    marginBottom: 14,
  },
  moodChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1.5,
  },
  moodDot: { width: 6, height: 6, borderRadius: 999 },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleTrack: {
    width: 38,
    height: 22,
    borderRadius: 999,
    padding: 2,
  },
  toggleKnob: {
    width: 18,
    height: 18,
    borderRadius: 999,
    backgroundColor: '#fff',
  },
  plane: {
    position: 'absolute',
    left: '50%',
    bottom: 140,
    marginLeft: -22,
  },
  planeTextWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '46%',
    alignItems: 'center',
  },
  planeText: {
    fontFamily: SERIF.italic,
    fontSize: 20,
  },
});
