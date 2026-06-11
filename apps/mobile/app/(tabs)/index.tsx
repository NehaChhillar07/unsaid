import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import Svg, { Path } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { type FeedPost, type ReactionType } from '@unsaid/tokens';
import {
  countNewSince,
  fetchFeed,
  markSeen,
  muteAuthorOf,
  react as sendReaction,
  report as sendReport,
  toggleSave,
} from '@unsaid/api';
import { supabase } from '../../src/lib/supabase';
import { track, captureError } from '../../src/lib/analytics';
import { useTheme } from '../../src/theme/ThemeContext';
import { useFreshDrops } from '../../src/state/FreshDropsContext';
import { UI } from '../../src/theme/fonts';
import { DeckCard } from '../../src/components/feed/DeckCard';
import { ConfessionCard, type BurstOrigin } from '../../src/components/feed/ConfessionCard';
import { SwipeCard } from '../../src/components/feed/SwipeCard';
import { CaughtUp } from '../../src/components/feed/CaughtUp';
import {
  ReactionBurst,
  makeBurst,
  type ParticleSpec,
} from '../../src/components/feed/ReactionBurst';
import { CommentsSheet } from '../../src/components/feed/CommentsSheet';
import {
  CardActionsSheet,
  type ReportReason,
} from '../../src/components/feed/CardActionsSheet';
import { Toast } from '../../src/components/Toast';

type Sort = 'newest' | 'felt';

export default function FeedScreen() {
  const { world, dark, motion, w, ink, inkSoft } = useTheme();
  const qc = useQueryClient();
  const { count: freshCount, setCount: setFreshCount } = useFreshDrops();

  const [sort, setSort] = useState<Sort>('newest');
  const [index, setIndex] = useState(0);
  const [reacted, setReacted] = useState<Record<string, ReactionType | null>>({});
  const [toast, setToast] = useState<string | null>(null);
  const [ribbon, setRibbon] = useState(false);
  const [particles, setParticles] = useState<ParticleSpec[]>([]);
  const [actionPost, setActionPost] = useState<FeedPost | null>(null);
  const [commentsPost, setCommentsPost] = useState<FeedPost | null>(null);

  const hostRef = useRef<View>(null);
  const commentsRef = useRef<BottomSheetModal>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ribbonTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // shared values driving the deck + hint stamps (owned here, reset on commit)
  const progress = useSharedValue(0);
  const hintLeft = useSharedValue(0); // left stamp: shows while swiping right
  const hintRight = useSharedValue(0); // right stamp: shows while swiping left
  const ribbonV = useSharedValue(0);

  const feedQ = useInfiniteQuery({
    queryKey: ['feed', world, sort],
    queryFn: ({ pageParam }) => fetchFeed(supabase, world, sort, pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
  });

  const posts = useMemo(
    () => feedQ.data?.pages.flatMap((p) => p.posts) ?? [],
    [feedQ.data],
  );

  useEffect(() => {
    setIndex(0);
    progress.value = 0;
    hintLeft.value = 0;
    hintRight.value = 0;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [world, sort]);

  // prefetch the next page when the deck runs low
  useEffect(() => {
    if (
      posts.length > 0 &&
      posts.length - index <= 3 &&
      feedQ.hasNextPage &&
      !feedQ.isFetchingNextPage
    ) {
      void feedQ.fetchNextPage();
    }
  }, [index, posts.length, feedQ]);

  // 45s poll for fresh drops since the newest card we know about
  const sinceRef = useRef<string>(new Date().toISOString());
  useEffect(() => {
    const newest = posts[0]?.created_at;
    if (newest) sinceRef.current = newest;
  }, [posts]);
  useEffect(() => {
    setFreshCount(0);
    const id = setInterval(() => {
      countNewSince(supabase, world, sinceRef.current)
        .then(setFreshCount)
        .catch(() => {});
    }, 45_000);
    return () => clearInterval(id);
  }, [world, setFreshCount]);

  const showToast = useCallback((msg: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(msg);
    toastTimer.current = setTimeout(() => setToast(null), 1800);
  }, []);

  const post = posts[index];
  const next = posts[index + 1];
  const caughtUp = !feedQ.isLoading && index >= posts.length;

  // ── reactions ────────────────────────────────────────────────
  const triggerBurst = useCallback(
    (origin: BurstOrigin) => {
      if (!motion) return;
      hostRef.current?.measureInWindow((hx, hy) => {
        const burst = makeBurst({ x: origin.x - hx, y: origin.y - hy });
        setParticles((prev) => [...prev, ...burst]);
        setTimeout(() => {
          setParticles((prev) => prev.filter((x) => !burst.some((b) => b.id === x.id)));
        }, 1800);
      });
    },
    [motion],
  );

  const onFelt = useCallback(
    (p: FeedPost, origin: BurstOrigin) => {
      const turningOn = reacted[p.id] !== 'felt';
      setReacted((s) => ({ ...s, [p.id]: turningOn ? 'felt' : null }));
      sendReaction(supabase, p.id, 'felt').catch((e) => captureError(e));
      if (turningOn) {
        triggerBurst(origin);
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        track('reaction', { type: 'felt', mode: world });
      }
    },
    [reacted, triggerBurst, world],
  );

  const onSame = useCallback(
    (p: FeedPost) => {
      const turningOn = reacted[p.id] !== 'same';
      setReacted((s) => ({ ...s, [p.id]: turningOn ? 'same' : null }));
      sendReaction(supabase, p.id, 'same').catch((e) => captureError(e));
      if (turningOn) {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        track('reaction', { type: 'same', mode: world });
        ribbonV.value = motion
          ? withTiming(1, { duration: 400, easing: Easing.bezier(0.16, 1, 0.3, 1) })
          : 1;
        setRibbon(true);
        if (ribbonTimer.current) clearTimeout(ribbonTimer.current);
        ribbonTimer.current = setTimeout(() => {
          ribbonV.value = motion ? withTiming(0, { duration: 300 }) : 0;
          setRibbon(false);
        }, 1900);
      }
    },
    [reacted, world, motion, ribbonV],
  );

  // ── swipe commits ────────────────────────────────────────────
  const onSwipedOff = useCallback(
    (_dir: 'left' | 'right') => {
      const current = posts[index];
      if (current) {
        markSeen(supabase, current.id).catch(() => {});
        track('swipe', { mode: world });
      }
      progress.value = 0;
      hintLeft.value = 0;
      hintRight.value = 0;
      setIndex((i) => i + 1);
    },
    [posts, index, world, progress, hintLeft, hintRight],
  );

  const openComments = useCallback((p: FeedPost) => {
    setCommentsPost(p);
    requestAnimationFrame(() => commentsRef.current?.present());
  }, []);

  // ── fresh drops ──────────────────────────────────────────────
  const acceptNew = useCallback(async () => {
    const n = freshCount;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSort('newest');
    await qc.resetQueries({ queryKey: ['feed', world] });
    setIndex(0);
    setFreshCount(0);
    showToast(`${n} fresh ${n === 1 ? 'drop' : 'drops'} added 🤍`);
  }, [freshCount, qc, world, setFreshCount, showToast]);

  // ── long-press actions ───────────────────────────────────────
  const onSave = useCallback(
    (p: FeedPost) => {
      setActionPost(null);
      toggleSave(supabase, p.id, true).catch((e) => captureError(e));
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      showToast('saved to your space 🤍');
      void qc.invalidateQueries({ queryKey: ['saved', world] });
    },
    [showToast, qc, world],
  );

  const onReport = useCallback(
    (p: FeedPost, reason: ReportReason) => {
      setActionPost(null);
      sendReport(supabase, { type: 'post', id: p.id }, reason).catch((e) => captureError(e));
      showToast('thank you. we’ll look after it 🤍');
    },
    [showToast],
  );

  const onMute = useCallback(
    (p: FeedPost) => {
      setActionPost(null);
      muteAuthorOf(supabase, { type: 'post', id: p.id }).catch((e) => captureError(e));
      markSeen(supabase, p.id).catch(() => {});
      showToast('you won’t see this voice again');
      setIndex((i) => i + 1);
    },
    [showToast],
  );

  // ── animated bits ────────────────────────────────────────────
  const deckProgressStyle = useAnimatedStyle(() => {
    const p = progress.value;
    return {
      opacity: 0.72 + 0.28 * p,
      transform: [{ scale: 0.94 + 0.06 * p }, { translateY: 14 * (1 - p) }],
    };
  });
  const hintLeftStyle = useAnimatedStyle(() => ({ opacity: hintLeft.value }));
  const hintRightStyle = useAnimatedStyle(() => ({ opacity: hintRight.value }));
  const ribbonStyle = useAnimatedStyle(() => ({
    opacity: ribbonV.value,
    transform: [{ translateY: (1 - ribbonV.value) * -12 }],
  }));

  const hintStamp = (side: 'left' | 'right') => (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.hint,
        side === 'left' ? { left: 32, transform: [{ rotate: '-8deg' }] } : { right: 32, transform: [{ rotate: '8deg' }] },
        {
          backgroundColor: dark ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.82)',
          borderColor: w.accent,
        },
        side === 'left' ? hintLeftStyle : hintRightStyle,
      ]}
    >
      <Text style={{ fontFamily: UI.bold, fontSize: 13.5, color: dark ? '#fff' : w.ink }}>
        next 🤍
      </Text>
    </Animated.View>
  );

  return (
    <View ref={hostRef} style={styles.host} collapsable={false}>
      <View style={styles.deckArea}>
        {/* sort control — left rail, tucked under the mode toggle */}
        {!caughtUp && (
          <Pressable
            onPress={() => {
              void Haptics.selectionAsync();
              setSort((s) => (s === 'newest' ? 'felt' : 'newest'));
            }}
            style={[
              styles.sortPill,
              {
                backgroundColor: dark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.5)',
                borderColor: dark ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.85)',
              },
            ]}
          >
            <Svg width={13} height={13} viewBox="0 0 24 24" fill="none">
              <Path
                d="M7 4v16m0 0l-3-3m3 3l3-3M17 20V4m0 0l-3 3m3-3l3 3"
                stroke={ink}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
            <Text style={{ fontFamily: UI.semibold, fontSize: 12.5, color: ink }}>
              {sort === 'newest' ? 'newest' : 'most felt'}
            </Text>
          </Pressable>
        )}

        {/* live new-drops pill */}
        {!caughtUp && freshCount > 0 && (
          <Pressable
            onPress={() => void acceptNew()}
            style={[styles.dropsPill, { backgroundColor: w.accent, shadowColor: w.accent }]}
          >
            <View style={styles.dropsDot} />
            <Text style={{ fontFamily: UI.semibold, fontSize: 13.5, color: '#fff' }}>
              {freshCount} new {freshCount === 1 ? 'drop' : 'drops'}
            </Text>
            <Svg width={15} height={15} viewBox="0 0 24 24" fill="none">
              <Path
                d="M12 4v11m0 0l-4-4m4 4l4-4M5 20h14"
                stroke="#fff"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </Pressable>
        )}

        {caughtUp ? (
          <CaughtUp
            onRestart={() => {
              void qc.resetQueries({ queryKey: ['feed', world] });
              setIndex(0);
            }}
          />
        ) : (
          <>
            {/* decorative deck stack behind — pure visual depth */}
            {[2, 1].map((depth) => (
              <View
                key={`deck-${depth}`}
                pointerEvents="none"
                style={[
                  styles.cardLayer,
                  {
                    transform: [
                      { scale: 0.95 - depth * 0.045 },
                      { translateY: 16 + depth * 17 },
                    ],
                    opacity: dark ? 0.5 - depth * 0.13 : 0.7 - depth * 0.17,
                  },
                ]}
              >
                <DeckCard depth={depth} />
              </View>
            ))}
            {/* next card peeking behind */}
            {next && (
              <Animated.View
                key={`behind-${next.id}`}
                pointerEvents="none"
                style={[styles.cardLayer, deckProgressStyle]}
              >
                <ConfessionCard post={next} interactive={false} reacted={null} />
              </Animated.View>
            )}
            {/* swipe hint stamps */}
            {hintStamp('left')}
            {hintStamp('right')}
            {/* active card */}
            {post && (
              <SwipeCard
                key={post.id}
                post={post}
                reacted={reacted[post.id] ?? null}
                motion={motion}
                progress={progress}
                hintLeft={hintLeft}
                hintRight={hintRight}
                onSwipedOff={onSwipedOff}
                onSwipeUp={() => openComments(post)}
                onFelt={(origin) => onFelt(post, origin)}
                onSame={() => onSame(post)}
                onComments={() => openComments(post)}
                onLongPress={() => setActionPost(post)}
              />
            )}
          </>
        )}

        <ReactionBurst particles={particles} />

        {/* "you're not alone" ribbon */}
        <Animated.View pointerEvents="none" style={[styles.ribbonWrap, ribbonStyle]}>
          {ribbon && (
            <View style={[styles.ribbon, { backgroundColor: w.accent }]}>
              <Text style={{ fontFamily: UI.semibold, fontSize: 13.5, color: '#fff' }}>
                🫂 you're not alone in this
              </Text>
            </View>
          )}
        </Animated.View>

        <Toast message={toast} top={18} />
      </View>

      <CommentsSheet
        ref={commentsRef}
        post={commentsPost}
        onDismiss={() => setCommentsPost(null)}
      />
      <CardActionsSheet
        post={actionPost}
        onClose={() => setActionPost(null)}
        onSave={onSave}
        onReport={onReport}
        onMute={onMute}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  host: { flex: 1 },
  deckArea: { flex: 1, position: 'relative' },
  cardLayer: {
    position: 'absolute',
    top: 4,
    left: 18,
    right: 18,
    bottom: 0,
    justifyContent: 'center',
  },
  sortPill: {
    position: 'absolute',
    top: 8,
    left: 18,
    zIndex: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 13,
    borderRadius: 999,
    borderWidth: 1,
  },
  dropsPill: {
    position: 'absolute',
    top: 54,
    alignSelf: 'center',
    zIndex: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingVertical: 9,
    paddingLeft: 13,
    paddingRight: 15,
    borderRadius: 999,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 13,
    shadowOpacity: 0.4,
  },
  dropsDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: '#fff',
  },
  hint: {
    position: 'absolute',
    top: '40%',
    zIndex: 30,
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 999,
    borderWidth: 1.5,
    opacity: 0,
  },
  ribbonWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 18,
    alignItems: 'center',
    zIndex: 45,
  },
  ribbon: {
    paddingVertical: 9,
    paddingHorizontal: 18,
    borderRadius: 999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 11,
    shadowOpacity: 0.18,
  },
});
