import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Path } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import {
  MOODS,
  formatCount,
  type FeedPost,
  type MoodKey,
  type OwnPost,
} from '@unsaid/tokens';
import {
  deleteOwnPost,
  fetchDraft,
  fetchOwnPosts,
  fetchSaved,
  roleCheck,
  upsertIdentity,
  wipeAccount,
} from '@unsaid/api';
import { supabase } from '../../src/lib/supabase';
import { track, captureError } from '../../src/lib/analytics';
import { useTheme } from '../../src/theme/ThemeContext';
import { useAuth } from '../../src/state/AuthContext';
import { useIdentities } from '../../src/hooks/useIdentities';
import { RoleBadge } from '../../src/components/RoleBadge';
import { MoodChip } from '../../src/components/MoodChip';
import { SERIF, UI } from '../../src/theme/fonts';

type Segment = 'posts' | 'saved' | 'drafts';

// ── role titles edit modal ─────────────────────────────────────

function localGuard(txt: string): string | null {
  const t = txt.toLowerCase();
  const named =
    /\b(at|@)\s+[a-z]/.test(t) ||
    /\b(google|meta|amazon|infosys|tcs|deloitte|kpmg|microsoft|apple)\b/.test(t);
  const place = /\b(gurgaon|bangalore|mumbai|delhi|noida|pune|seattle|london|sf|nyc)\b/.test(t);
  if (named || place) return 'that might point right at you — try a broader title 🤍';
  return null;
}

function useRoleWarning(value: string): string | null {
  const [warning, setWarning] = useState<string | null>(null);
  useEffect(() => {
    const v = value.trim();
    if (!v) {
      setWarning(null);
      return;
    }
    const t = setTimeout(() => {
      roleCheck(supabase, v)
        .then((res) => setWarning(res.ok ? null : (res.warning ?? null)))
        .catch(() => setWarning(localGuard(v)));
    }, 450);
    return () => clearTimeout(t);
  }, [value]);
  return warning;
}

function RolesModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { dark, ink, inkSoft, sheetBg, w } = useTheme();
  const qc = useQueryClient();
  const identities = useIdentities();
  const personal = identities.data?.find((i) => i.mode === 'personal');
  const professional = identities.data?.find((i) => i.mode === 'professional');
  const [pRole, setPRole] = useState('');
  const [wRole, setWRole] = useState('');
  const [busy, setBusy] = useState(false);
  const pWarn = useRoleWarning(pRole);
  const wWarn = useRoleWarning(wRole);

  useEffect(() => {
    if (visible) {
      setPRole(personal?.role_title ?? '');
      setWRole(professional?.role_title ?? '');
    }
  }, [visible, personal?.role_title, professional?.role_title]);

  const save = async () => {
    if (!pRole.trim() || !wRole.trim() || busy) return;
    setBusy(true);
    try {
      await upsertIdentity(supabase, 'personal', pRole.trim(), personal?.topics ?? []);
      await upsertIdentity(supabase, 'professional', wRole.trim(), professional?.topics ?? []);
      await qc.invalidateQueries({ queryKey: ['identities'] });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onClose();
    } catch (e) {
      captureError(e);
      Alert.alert('that didn’t save', 'check your connection and try again 🤍');
    } finally {
      setBusy(false);
    }
  };

  const field = (
    label: string,
    dot: string,
    value: string,
    set: (v: string) => void,
    warn: string | null,
  ) => (
    <View style={{ marginBottom: 10 }}>
      <View style={modalStyles.sectionRow}>
        <View style={[modalStyles.sectionDot, { backgroundColor: dot }]} />
        <Text style={{ fontFamily: UI.semibold, fontSize: 13, color: ink }}>{label}</Text>
      </View>
      <View
        style={[
          modalStyles.field,
          {
            backgroundColor: dark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.7)',
            borderColor: warn
              ? 'rgba(232,131,107,0.6)'
              : dark
                ? 'rgba(255,255,255,0.14)'
                : 'rgba(255,255,255,0.9)',
          },
        ]}
      >
        <TextInput
          value={value}
          onChangeText={set}
          autoCapitalize="none"
          style={{ flex: 1, fontFamily: UI.regular, fontSize: 15.5, color: ink }}
        />
      </View>
      <Text
        style={{
          minHeight: 18,
          paddingTop: 5,
          paddingHorizontal: 6,
          fontFamily: UI.regular,
          fontSize: 11.5,
          color: warn ? '#D9694C' : inkSoft,
        }}
      >
        {warn ?? 'this is the only thing people see — never your name'}
      </Text>
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={modalStyles.host}>
        <Pressable style={[StyleSheet.absoluteFill, modalStyles.backdrop]} onPress={onClose} />
        <View style={[modalStyles.sheet, { backgroundColor: sheetBg }]}>
          <Text style={{ fontFamily: UI.bold, fontSize: 18, color: ink, marginBottom: 14 }}>
            change your role titles
          </Text>
          {field('personal · warm world', '#B06A48', pRole, setPRole, pWarn)}
          {field('professional · cool world', '#5A7388', wRole, setWRole, wWarn)}
          <Text style={{ fontFamily: UI.regular, fontSize: 11.5, color: inkSoft, marginBottom: 16 }}>
            old spills wear the new title too — your past stays as anonymous as your present.
          </Text>
          <Pressable
            onPress={() => void save()}
            disabled={!pRole.trim() || !wRole.trim() || busy}
            style={({ pressed }) => [
              modalStyles.saveBtn,
              {
                backgroundColor: w.accent,
                opacity: !pRole.trim() || !wRole.trim() || busy ? 0.5 : pressed ? 0.88 : 1,
              },
            ]}
          >
            <Text style={{ fontFamily: UI.semibold, fontSize: 15.5, color: '#fff' }}>
              {busy ? 'saving…' : 'save'}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

// ── anonymity & data modal ─────────────────────────────────────

function AnonymityModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { ink, inkSoft, sheetBg, w } = useTheme();
  const para = (head: string, body: string) => (
    <View style={{ marginBottom: 16 }}>
      <Text style={{ fontFamily: UI.semibold, fontSize: 14.5, color: ink, marginBottom: 4 }}>
        {head}
      </Text>
      <Text style={{ fontFamily: UI.regular, fontSize: 13.5, lineHeight: 13.5 * 1.55, color: inkSoft }}>
        {body}
      </Text>
    </View>
  );
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={modalStyles.host}>
        <Pressable style={[StyleSheet.absoluteFill, modalStyles.backdrop]} onPress={onClose} />
        <View style={[modalStyles.sheet, { backgroundColor: sheetBg, maxHeight: '86%' }]}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={{ fontFamily: UI.bold, fontSize: 18, color: ink, marginBottom: 14 }}>
              anonymity & data — what we keep
            </Text>
            {para(
              'anonymous to everyone here',
              'your posts and replies show only your role title — never a name, never a handle, never a photo. your personal and professional worlds are never linked publicly.',
            )}
            {para(
              'what we keep server-side',
              'the email you sign in with, your two role titles and topics, what you post, react to and report, and minimal moderation logs. that’s the bare minimum to stop abuse — nothing more.',
            )}
            {para(
              'what we never do',
              'we never sell your data, never build ad profiles from your feelings, and never show your identity to another user.',
            )}
            {para(
              'if the law asks',
              'we honour valid legal requests — and we deliberately keep so little that there is very little to give.',
            )}
            {para(
              'deleting really deletes',
              'wiping your account hard-deletes every post, reply, reaction and draft. no shadow copy. gone means gone.',
            )}
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [
                modalStyles.saveBtn,
                { backgroundColor: w.accent, opacity: pressed ? 0.88 : 1, marginTop: 4 },
              ]}
            >
              <Text style={{ fontFamily: UI.semibold, fontSize: 15.5, color: '#fff' }}>okay</Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const modalStyles = StyleSheet.create({
  host: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { backgroundColor: 'rgba(20,10,18,0.4)' },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 34,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  sectionDot: { width: 9, height: 9, borderRadius: 999 },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 54,
    borderRadius: 16,
    borderWidth: 1.5,
    paddingHorizontal: 14,
  },
  saveBtn: {
    width: '100%',
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

// ── the You space ──────────────────────────────────────────────

export default function YouScreen() {
  const { world, dark, w, ink, inkSoft, surface } = useTheme();
  const qc = useQueryClient();
  const router = useRouter();
  const { clearOnboarded } = useAuth();
  const identities = useIdentities();
  const role = identities.data?.find((i) => i.mode === world)?.role_title ?? '…';

  const [seg, setSeg] = useState<Segment>('posts');
  const [rolesOpen, setRolesOpen] = useState(false);
  const [anonOpen, setAnonOpen] = useState(false);

  const postsQ = useQuery({
    queryKey: ['own-posts', world],
    queryFn: () => fetchOwnPosts(supabase, world),
  });
  const savedQ = useQuery({
    queryKey: ['saved', world],
    queryFn: () => fetchSaved(supabase, world),
  });
  const draftQ = useQuery({
    queryKey: ['draft', world],
    queryFn: () => fetchDraft(supabase, world),
  });

  const posts = postsQ.data ?? [];
  const totalFelt = posts.reduce((s, p) => s + p.felt_count, 0);
  const totalSame = posts.reduce((s, p) => s + p.same_count, 0);

  // weekly recap (computed from own posts; decorative for V1)
  const recap = useMemo(() => {
    const weekAgo = Date.now() - 7 * 86_400_000;
    const week = posts.filter((p) => new Date(p.created_at).getTime() > weekAgo);
    const moodCounts = new Map<MoodKey, number>();
    let felt = 0;
    for (const p of week) {
      felt += p.felt_count;
      if (p.mood) moodCounts.set(p.mood, (moodCounts.get(p.mood) ?? 0) + 1);
    }
    let dominant: MoodKey | null = null;
    let best = 0;
    for (const [m, c] of moodCounts) {
      if (c > best) {
        best = c;
        dominant = m;
      }
    }
    return { count: week.length, dominant, felt };
  }, [posts]);

  const confirmDelete = (post: OwnPost) => {
    Alert.alert('let this one go?', 'gone means gone — no shadow copy.', [
      { text: 'keep it', style: 'cancel' },
      {
        text: 'delete',
        style: 'destructive',
        onPress: () => {
          deleteOwnPost(supabase, post.id)
            .then(() => {
              void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              void qc.invalidateQueries({ queryKey: ['own-posts', world] });
              void qc.invalidateQueries({ queryKey: ['feed', world] });
            })
            .catch((e) => {
              captureError(e);
              Alert.alert('that didn’t work', 'try again in a moment 🤍');
            });
        },
      },
    ]);
  };

  const confirmWipe = () => {
    Alert.alert(
      'delete account & wipe everything',
      'every post, reply, reaction, save and draft — in both worlds — gone forever.',
      [
        { text: 'keep my space', style: 'cancel' },
        {
          text: 'continue',
          style: 'destructive',
          onPress: () => {
            Alert.alert('last chance', 'this really deletes everything. no recovery. no shadow copy.', [
              { text: 'cancel', style: 'cancel' },
              {
                text: 'wipe it all',
                style: 'destructive',
                onPress: () => {
                  void (async () => {
                    try {
                      await wipeAccount(supabase);
                      track('account_wiped');
                      await clearOnboarded();
                      await supabase.auth.signOut();
                      qc.clear();
                      router.replace('/(onboarding)');
                    } catch (e) {
                      captureError(e);
                      Alert.alert('that didn’t work', 'try again in a moment 🤍');
                    }
                  })();
                },
              },
            ]);
          },
        },
      ],
    );
  };

  const stat = (val: string | number, label: string) => (
    <View key={label} style={[styles.stat, { backgroundColor: surface }]}>
      <Text
        style={{
          fontFamily: UI.bold,
          fontSize: 26,
          color: ink,
          letterSpacing: 26 * -0.02,
          fontVariant: ['tabular-nums'],
        }}
      >
        {val}
      </Text>
      <Text style={{ fontFamily: UI.regular, fontSize: 12, color: inkSoft, marginTop: 2 }}>
        {label}
      </Text>
    </View>
  );

  const ownPostCard = (p: OwnPost) => (
    <View key={p.id} style={[styles.miniCard, { backgroundColor: surface }]}>
      <View style={styles.miniHead}>
        <MoodChip mood={p.mood} dark={dark} />
        <Pressable onPress={() => confirmDelete(p)} hitSlop={10}>
          <Text style={{ fontFamily: UI.bold, fontSize: 16, color: inkSoft, letterSpacing: 1 }}>
            ···
          </Text>
        </Pressable>
      </View>
      <Text style={{ fontFamily: SERIF.regular, fontSize: 15.5, lineHeight: 15.5 * 1.4, color: ink }}>
        {p.body}
      </Text>
      <View style={{ flexDirection: 'row', gap: 14, marginTop: 10 }}>
        <Text style={{ fontFamily: UI.regular, fontSize: 12.5, color: inkSoft }}>
          🤍 {formatCount(p.felt_count)}
        </Text>
        <Text style={{ fontFamily: UI.regular, fontSize: 12.5, color: inkSoft }}>
          🫂 {formatCount(p.same_count)}
        </Text>
      </View>
    </View>
  );

  const savedCard = (p: FeedPost) => (
    <View key={p.id} style={[styles.miniCard, { backgroundColor: surface }]}>
      <View style={styles.miniHead}>
        <RoleBadge
          role={p.role_title}
          color={ink}
          bg={dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)'}
        />
        <MoodChip mood={p.mood} dark={dark} />
      </View>
      <Text style={{ fontFamily: SERIF.regular, fontSize: 15.5, lineHeight: 15.5 * 1.4, color: ink }}>
        {p.body}
      </Text>
    </View>
  );

  const emptyNote = (msg: string) => (
    <View style={[styles.miniCard, { backgroundColor: surface }]}>
      <Text
        style={{
          fontFamily: SERIF.italic,
          fontSize: 15,
          color: inkSoft,
          lineHeight: 15 * 1.45,
          textAlign: 'center',
        }}
      >
        {msg}
      </Text>
    </View>
  );

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* profile head */}
      <View style={{ paddingTop: 8, paddingHorizontal: 4, paddingBottom: 18 }}>
        <View style={styles.headRow}>
          <Text style={{ fontFamily: UI.bold, fontSize: 30, letterSpacing: 30 * -0.02, color: ink }}>
            your space
          </Text>
          <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
            <Circle cx={12} cy={12} r={3} stroke={inkSoft} strokeWidth={2} />
            <Path
              d="M12 4v2M12 18v2M4 12h2M18 12h2M6.3 6.3l1.4 1.4M16.3 16.3l1.4 1.4M17.7 6.3l-1.4 1.4M7.7 16.3l-1.4 1.4"
              stroke={inkSoft}
              strokeWidth={2}
              strokeLinecap="round"
            />
          </Svg>
        </View>
        <View style={{ marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <RoleBadge role={role} color={ink} bg={surface} />
          <Text style={{ fontFamily: UI.regular, fontSize: 12.5, color: inkSoft }}>
            your {world} self · private to you
          </Text>
        </View>
      </View>

      {/* stats */}
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 22 }}>
        {stat(formatCount(totalFelt), 'felt received')}
        {stat(formatCount(totalSame), '“same” received')}
        {stat(posts.length, 'spills')}
      </View>

      {/* weekly recap teaser */}
      <LinearGradient
        colors={[w.accent, world === 'personal' ? '#9C5A3C' : '#43586B']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.recap}
      >
        <Text style={styles.recapGhost}>🤍</Text>
        <Text style={styles.recapKicker}>this week</Text>
        <Text style={styles.recapBody}>
          {recap.count > 0
            ? `you spilled ${recap.count} ${recap.count === 1 ? 'time' : 'times'}${
                recap.dominant ? `, mostly ${MOODS[recap.dominant].label}` : ''
              }. ${formatCount(recap.felt)} people felt you.`
            : 'a quiet week. nothing spilled yet — the feed is listening whenever 🤍'}
        </Text>
        <Text style={styles.recapLink}>see your recap →</Text>
      </LinearGradient>

      {/* segmented */}
      <View
        style={[
          styles.segments,
          { backgroundColor: dark ? 'rgba(255,255,255,0.09)' : 'rgba(255,255,255,0.5)' },
        ]}
      >
        {(['posts', 'saved', 'drafts'] as Segment[]).map((s) => (
          <Pressable
            key={s}
            onPress={() => {
              void Haptics.selectionAsync();
              setSeg(s);
            }}
            style={[
              styles.segment,
              seg === s && {
                backgroundColor: dark ? 'rgba(255,255,255,0.14)' : '#fff',
                shadowColor: '#3B332B',
                shadowOffset: { width: 0, height: 1 },
                shadowRadius: 3,
                shadowOpacity: 0.1,
              },
            ]}
          >
            <Text
              style={{
                fontFamily: seg === s ? UI.bold : UI.medium,
                fontSize: 13,
                color: seg === s ? ink : inkSoft,
              }}
            >
              {s}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={{ gap: 10 }}>
        {seg === 'posts' &&
          (posts.length > 0
            ? posts.map(ownPostCard)
            : emptyNote('nothing spilled in this world yet.'))}
        {seg === 'saved' &&
          ((savedQ.data?.length ?? 0) > 0
            ? (savedQ.data ?? []).map(savedCard)
            : emptyNote('nothing saved yet — hold a card to keep it.'))}
        {seg === 'drafts' &&
          (draftQ.data ? (
            <View style={[styles.miniCard, { backgroundColor: surface, paddingVertical: 18 }]}>
              <MoodChip mood={draftQ.data.mood} dark={dark} />
              <Text
                style={{
                  fontFamily: SERIF.italic,
                  fontSize: 15.5,
                  color: inkSoft,
                  marginTop: 8,
                  lineHeight: 15.5 * 1.4,
                }}
              >
                "{draftQ.data.body}"
              </Text>
              <Text style={{ fontFamily: UI.regular, fontSize: 12, color: inkSoft, marginTop: 8 }}>
                auto-saved · half a feeling is still a feeling
              </Text>
            </View>
          ) : (
            emptyNote('no drafts here. half a feeling is still a feeling.')
          ))}
      </View>

      {/* account controls */}
      <View style={[styles.account, { backgroundColor: surface }]}>
        {[
          { label: 'change your role titles', danger: false, onPress: () => setRolesOpen(true) },
          { label: 'anonymity & data — what we keep', danger: false, onPress: () => setAnonOpen(true) },
          { label: 'delete account & wipe everything', danger: true, onPress: confirmWipe },
        ].map((r, i, arr) => (
          <Pressable
            key={r.label}
            onPress={r.onPress}
            style={({ pressed }) => [
              styles.accountRow,
              i < arr.length - 1 && {
                borderBottomWidth: 1,
                borderBottomColor: dark ? 'rgba(255,255,255,0.07)' : 'rgba(59,51,43,0.07)',
              },
              pressed && { opacity: 0.6 },
            ]}
          >
            <Text
              style={{
                fontFamily: r.danger ? UI.semibold : UI.medium,
                fontSize: 14.5,
                color: r.danger ? '#D9694C' : ink,
              }}
            >
              {r.label}
            </Text>
            <Text style={{ color: inkSoft, fontSize: 16 }}>›</Text>
          </Pressable>
        ))}
      </View>
      <Text style={[styles.footer, { color: inkSoft }]}>
        deleting really deletes. no shadow copy, no "are you sure we can win you back." gone means
        gone.
      </Text>

      <RolesModal visible={rolesOpen} onClose={() => setRolesOpen(false)} />
      <AnonymityModal visible={anonOpen} onClose={() => setAnonOpen(false)} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 18, paddingBottom: 120 },
  headRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stat: { flex: 1, borderRadius: 18, paddingVertical: 16, paddingHorizontal: 14 },
  recap: {
    borderRadius: 22,
    padding: 18,
    marginBottom: 22,
    overflow: 'hidden',
  },
  recapGhost: {
    position: 'absolute',
    top: -20,
    right: -10,
    fontSize: 70,
    opacity: 0.2,
  },
  recapKicker: {
    fontFamily: UI.semibold,
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
    letterSpacing: 12 * 0.04,
    textTransform: 'uppercase',
  },
  recapBody: {
    fontFamily: SERIF.regular,
    fontSize: 19,
    lineHeight: 19 * 1.35,
    color: '#fff',
    marginTop: 6,
    maxWidth: 240,
  },
  recapLink: {
    fontFamily: UI.regular,
    fontSize: 12.5,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 10,
  },
  segments: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 14,
    padding: 4,
    borderRadius: 14,
  },
  segment: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 11,
    alignItems: 'center',
  },
  miniCard: { borderRadius: 18, paddingVertical: 14, paddingHorizontal: 16 },
  miniHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  account: { marginTop: 24, borderRadius: 20, overflow: 'hidden' },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    paddingHorizontal: 16,
  },
  footer: {
    textAlign: 'center',
    paddingTop: 18,
    paddingHorizontal: 30,
    fontFamily: UI.regular,
    fontSize: 11.5,
    lineHeight: 11.5 * 1.5,
  },
});
