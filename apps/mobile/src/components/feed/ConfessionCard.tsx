import React, { useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import {
  formatCount,
  relTime,
  type FeedPost,
  type ReactionType,
} from '@unsaid/tokens';
import { GradientCard } from '../GradientCard';
import { RoleBadge } from '../RoleBadge';
import { MoodChip } from '../MoodChip';
import { SERIF, UI } from '../../theme/fonts';
import { gradientPoints } from '../../theme/colors';
import { useTheme } from '../../theme/ThemeContext';

export interface BurstOrigin {
  x: number;
  y: number;
}

interface ConfessionCardProps {
  post: FeedPost;
  reacted?: ReactionType | null;
  interactive?: boolean;
  onFelt?: (origin: BurstOrigin) => void;
  onSame?: () => void;
  onComments?: () => void;
}

function ReactButton({
  active,
  glyph,
  label,
  count,
  color,
  onPress,
  disabled,
}: {
  active: boolean;
  glyph: string;
  label: string;
  count: number;
  color: string;
  onPress: (origin: BurstOrigin) => void;
  disabled: boolean;
}) {
  const { dark, ink, inkSoft } = useTheme();
  const ref = useRef<View>(null);
  return (
    <Pressable
      ref={ref}
      disabled={disabled}
      onPress={() => {
        const node = ref.current;
        if (node) {
          node.measureInWindow((x, y, w) => {
            onPress({ x: x + w / 2 - 14, y: y - 6 });
          });
        } else {
          onPress({ x: 0, y: 0 });
        }
      }}
      style={({ pressed }) => [
        styles.reactBtn,
        {
          backgroundColor: active
            ? `${color}${dark ? '45' : '24'}`
            : dark
              ? 'rgba(255,255,255,0.13)'
              : 'rgba(255,255,255,0.5)',
          borderColor: active ? color : 'transparent',
          transform: [{ scale: pressed ? 0.93 : 1 }],
        },
      ]}
    >
      <Text style={{ fontSize: 21, lineHeight: 24 }}>{glyph}</Text>
      <Text style={{ fontFamily: UI.semibold, fontSize: 11.5, color: ink }}>{label}</Text>
      <Text style={{ fontFamily: UI.regular, fontSize: 11, color: inkSoft, fontVariant: ['tabular-nums'] }}>
        {formatCount(count)}
      </Text>
    </Pressable>
  );
}

/** Exact prototype card: gradient bg, sheen, role/time/mood header, Lora body. */
export function ConfessionCard({
  post,
  reacted = null,
  interactive = true,
  onFelt,
  onSame,
  onComments,
}: ConfessionCardProps) {
  const { dark, w, ink, inkSoft } = useTheme();
  const bodySize = post.body.length > 130 ? 24 : 27;
  const sheenPts = gradientPoints(216);
  const replies = post.comment_count;
  const time = relTime(post.created_at);
  const isFresh = time === 'just now';

  return (
    <GradientCard
      id={post.id}
      style={[
        styles.card,
        dark
          ? { shadowColor: '#000', shadowOffset: { width: 0, height: 22 }, shadowRadius: 25, shadowOpacity: 0.38 }
          : { shadowColor: '#3B332B', shadowOffset: { width: 0, height: 18 }, shadowRadius: 22, shadowOpacity: 0.16 },
      ]}
    >
      {/* soft linear sheen across the top corner */}
      <LinearGradient
        pointerEvents="none"
        colors={[`rgba(255,255,255,${dark ? 0.05 : 0.22})`, 'transparent']}
        locations={[0, 0.4]}
        start={sheenPts.start}
        end={sheenPts.end}
        style={[StyleSheet.absoluteFill, { borderRadius: 26 }]}
      />
      {/* header: role + time + mood */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <RoleBadge
            role={post.role_title}
            color={ink}
            bg={dark ? 'rgba(255,255,255,0.17)' : 'rgba(255,255,255,0.55)'}
            style={{ flexShrink: 1 }}
          />
          <View style={styles.timeWrap}>
            {isFresh && <View style={[styles.freshDot, { backgroundColor: w.accent }]} />}
            <Text style={{ fontFamily: UI.medium, fontSize: 11.5, color: inkSoft }}>{time}</Text>
          </View>
        </View>
        <MoodChip mood={post.mood} dark={dark} />
      </View>
      {/* body — serif, diary feel */}
      <View style={styles.bodyWrap}>
        <Text
          style={{
            fontFamily: SERIF.medium,
            fontSize: bodySize,
            lineHeight: bodySize * 1.42,
            color: ink,
            letterSpacing: bodySize * 0.002,
          }}
        >
          {post.body}
        </Text>
      </View>
      {/* comments affordance */}
      <Pressable
        disabled={!interactive}
        onPress={onComments}
        style={styles.commentsAffordance}
        hitSlop={8}
      >
        <Svg width={15} height={15} viewBox="0 0 24 24" fill="none" opacity={0.55}>
          <Path
            d="M12 5l-5 5M12 5l5 5M12 5v13"
            stroke={inkSoft}
            strokeWidth={2.2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
        <Text style={{ fontFamily: UI.medium, fontSize: 12.5, color: inkSoft }}>
          swipe up · {replies} {replies === 1 ? 'reply' : 'replies'}
        </Text>
      </Pressable>
      {/* reactions */}
      <View style={styles.reactions}>
        <ReactButton
          active={reacted === 'felt'}
          glyph="🤍"
          label="felt this"
          count={post.felt_count + (reacted === 'felt' ? 1 : 0)}
          color={w.accent}
          disabled={!interactive}
          onPress={(origin) => onFelt?.(origin)}
        />
        <ReactButton
          active={reacted === 'same'}
          glyph="🫂"
          label="same"
          count={post.same_count + (reacted === 'same' ? 1 : 0)}
          color={w.accent}
          disabled={!interactive}
          onPress={() => onSame?.()}
        />
      </View>
    </GradientCard>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    borderRadius: 26,
    paddingTop: 22,
    paddingHorizontal: 22,
    paddingBottom: 18,
    overflow: 'visible',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    zIndex: 2,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    flexShrink: 1,
    minWidth: 0,
  },
  timeWrap: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  freshDot: { width: 6, height: 6, borderRadius: 999 },
  bodyWrap: {
    minHeight: 168,
    justifyContent: 'center',
    paddingVertical: 16,
    zIndex: 2,
  },
  commentsAffordance: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingTop: 6,
    paddingBottom: 12,
    zIndex: 2,
  },
  reactions: { flexDirection: 'row', gap: 10, zIndex: 2 },
  reactBtn: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
    paddingVertical: 11,
    paddingHorizontal: 6,
    borderRadius: 18,
    borderWidth: 1.5,
  },
});
