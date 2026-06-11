import React, { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { FeedPost } from '@unsaid/tokens';
import { UI } from '../../theme/fonts';
import { useTheme } from '../../theme/ThemeContext';

export const REPORT_REASONS = [
  'harassment',
  'doxxing',
  'self-harm method',
  'spam',
  'other',
] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

interface CardActionsSheetProps {
  post: FeedPost | null;
  onClose: () => void;
  onSave: (post: FeedPost) => void;
  onReport: (post: FeedPost, reason: ReportReason) => void;
  onMute: (post: FeedPost) => void;
}

/** Long-press action sheet: save 🤍 / report / mute this voice. */
export function CardActionsSheet({
  post,
  onClose,
  onSave,
  onReport,
  onMute,
}: CardActionsSheetProps) {
  const { dark, motion, ink, inkSoft, sheetBg } = useTheme();
  const insets = useSafeAreaInsets();
  const [view, setView] = useState<'menu' | 'report'>('menu');

  useEffect(() => {
    if (post) setView('menu');
  }, [post]);

  if (!post) return null;

  const row = (label: string, onPress: () => void, danger = false, last = false) => (
    <Pressable
      key={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        !last && {
          borderBottomWidth: 1,
          borderBottomColor: dark ? 'rgba(255,255,255,0.07)' : 'rgba(59,51,43,0.07)',
        },
        pressed && { opacity: 0.6 },
      ]}
    >
      <Text
        style={{
          fontFamily: danger ? UI.semibold : UI.medium,
          fontSize: 15,
          color: danger ? '#D9694C' : ink,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );

  return (
    <Modal transparent visible animationType="none" onRequestClose={onClose}>
      <View style={styles.host}>
        <Animated.View
          entering={motion ? FadeIn.duration(200) : undefined}
          style={StyleSheet.absoluteFill}
        >
          <Pressable style={[StyleSheet.absoluteFill, styles.backdrop]} onPress={onClose} />
        </Animated.View>
        <Animated.View
          entering={motion ? SlideInDown.duration(320) : undefined}
          style={[
            styles.sheet,
            { backgroundColor: sheetBg, paddingBottom: Math.max(insets.bottom, 20) },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: inkSoft, opacity: 0.4 }]} />
          {view === 'menu' ? (
            <>
              <Text style={[styles.title, { color: inkSoft }]}>this confession</Text>
              {row('save 🤍', () => onSave(post))}
              {row('report', () => setView('report'))}
              {row('mute this voice', () => onMute(post), false, true)}
            </>
          ) : (
            <>
              <Text style={[styles.title, { color: inkSoft }]}>
                what's wrong here? we read every one.
              </Text>
              {REPORT_REASONS.map((r, i) =>
                row(r, () => onReport(post, r), false, i === REPORT_REASONS.length - 1),
              )}
            </>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  host: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { backgroundColor: 'rgba(20,10,18,0.34)' },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  handle: {
    width: 38,
    height: 5,
    borderRadius: 999,
    alignSelf: 'center',
    marginBottom: 14,
  },
  title: {
    fontFamily: UI.medium,
    fontSize: 12.5,
    marginBottom: 6,
    paddingHorizontal: 2,
  },
  row: { paddingVertical: 15, paddingHorizontal: 2 },
});
