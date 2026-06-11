import React, { forwardRef, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  BottomSheetBackdrop,
  BottomSheetFlatList,
  BottomSheetModal,
  BottomSheetTextInput,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import {
  COMMENT_MAX_CHARS,
  type FeedPost,
  type PostComment,
} from '@unsaid/tokens';
import { fetchComments, publish } from '@unsaid/api';
import { supabase } from '../../lib/supabase';
import { RoleBadge } from '../RoleBadge';
import { SERIF, UI } from '../../theme/fonts';
import { useTheme } from '../../theme/ThemeContext';
import { track } from '../../lib/analytics';

interface CommentsSheetProps {
  post: FeedPost | null;
  onDismiss: () => void;
}

interface Thread {
  parent: PostComment;
  children: PostComment[];
}

export const CommentsSheet = forwardRef<BottomSheetModal, CommentsSheetProps>(
  function CommentsSheet({ post, onDismiss }, ref) {
    const { world, dark, ink, inkSoft, sheetBg, w } = useTheme();
    const qc = useQueryClient();
    const [text, setText] = useState('');
    const [sending, setSending] = useState(false);
    const [notice, setNotice] = useState<string | null>(null);

    const commentsQ = useQuery({
      queryKey: ['comments', post?.id],
      queryFn: () => fetchComments(supabase, post!.id),
      enabled: !!post,
    });

    const threads = useMemo<Thread[]>(() => {
      const comments = commentsQ.data ?? [];
      const kids = new Map<string, PostComment[]>();
      for (const c of comments) {
        if (c.parent_id) {
          const arr = kids.get(c.parent_id) ?? [];
          arr.push(c);
          kids.set(c.parent_id, arr);
        }
      }
      return comments
        .filter((c) => !c.parent_id)
        .map((parent) => ({ parent, children: kids.get(parent.id) ?? [] }));
    }, [commentsQ.data]);

    const flash = (msg: string) => {
      setNotice(msg);
      setTimeout(() => setNotice(null), 2600);
    };

    const send = async () => {
      const body = text.trim();
      if (!post || !body || sending || body.length > COMMENT_MAX_CHARS) return;
      setSending(true);
      try {
        const res = await publish(supabase, {
          kind: 'comment',
          mode: world,
          body,
          post_id: post.id,
          parent_id: null,
        });
        if (res.verdict === 'published') {
          setText('');
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          track('comment_published', { mode: world });
          await qc.invalidateQueries({ queryKey: ['comments', post.id] });
        } else {
          flash(res.message ?? "this one can't go out as written — soften it a little 🤍");
        }
      } catch {
        flash('couldn’t send that — try again in a moment 🤍');
      } finally {
        setSending(false);
      }
    };

    const renderBackdrop = (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        opacity={0.34}
        pressBehavior="close"
      />
    );

    const commentCard = (c: PostComment, indented: boolean) => (
      <View
        key={c.id}
        style={[
          styles.comment,
          indented && { marginLeft: 22, marginTop: 8 },
          { backgroundColor: dark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.7)' },
        ]}
      >
        <View style={{ marginBottom: 8 }}>
          <RoleBadge
            role={c.role_title}
            color={ink}
            bg={dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.04)'}
          />
        </View>
        <Text style={{ fontFamily: SERIF.regular, fontSize: 16, lineHeight: 16 * 1.45, color: ink }}>
          {c.body}
        </Text>
      </View>
    );

    return (
      <BottomSheetModal
        ref={ref}
        snapPoints={['74%']}
        enablePanDownToClose
        onDismiss={onDismiss}
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: sheetBg, borderRadius: 28 }}
        handleIndicatorStyle={{
          backgroundColor: inkSoft,
          opacity: 0.4,
          width: 38,
          height: 5,
        }}
        keyboardBehavior="extend"
        keyboardBlurBehavior="restore"
      >
        <View style={styles.content}>
          <Text style={[styles.title, { color: ink }]}>replies</Text>
          <Text style={[styles.subtitle, { color: inkSoft }]}>
            kindness only. anonymous, role-tagged, stricter rules than posts.
          </Text>
          {notice && (
            <View
              style={[
                styles.notice,
                { backgroundColor: dark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.85)' },
              ]}
            >
              <Text style={{ fontFamily: UI.semibold, fontSize: 12.5, color: ink }}>{notice}</Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <BottomSheetFlatList
              data={threads}
              keyExtractor={(t: Thread) => t.parent.id}
              contentContainerStyle={{ gap: 12, paddingBottom: 12 }}
              ListEmptyComponent={
                commentsQ.isLoading ? null : (
                  <View style={styles.empty}>
                    <Text style={[styles.emptyText, { color: inkSoft }]}>
                      no replies yet.{'\n'}be the first to say "same."
                    </Text>
                  </View>
                )
              }
              renderItem={({ item }: { item: Thread }) => (
                <View>
                  {commentCard(item.parent, false)}
                  {item.children.map((c) => commentCard(c, true))}
                </View>
              )}
            />
          </View>
          {post && !post.comments_enabled ? (
            <View style={styles.repliesOff}>
              <Text style={{ fontFamily: UI.medium, fontSize: 13, color: inkSoft }}>
                replies are off for this one
              </Text>
            </View>
          ) : (
            <View
              style={[
                styles.inputRow,
                { backgroundColor: dark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.8)' },
              ]}
            >
              <BottomSheetTextInput
                value={text}
                onChangeText={setText}
                placeholder="reply with care…"
                placeholderTextColor={inkSoft}
                style={[styles.input, { color: ink }]}
                maxLength={COMMENT_MAX_CHARS}
                multiline={false}
                onSubmitEditing={() => void send()}
                returnKeyType="send"
              />
              <Pressable
                onPress={() => void send()}
                disabled={sending || !text.trim()}
                style={({ pressed }) => [
                  styles.sendBtn,
                  {
                    backgroundColor: w.accent,
                    opacity: sending || !text.trim() ? 0.5 : pressed ? 0.85 : 1,
                  },
                ]}
              >
                <Text style={{ color: '#fff', fontSize: 17 }}>↑</Text>
              </Pressable>
            </View>
          )}
        </View>
      </BottomSheetModal>
    );
  },
);

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  title: { fontFamily: UI.bold, fontSize: 16, marginBottom: 4 },
  subtitle: { fontFamily: UI.regular, fontSize: 12.5, marginBottom: 16 },
  notice: {
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    marginBottom: 10,
  },
  empty: { paddingVertical: 40, paddingHorizontal: 20 },
  emptyText: {
    fontFamily: SERIF.italic,
    fontSize: 17,
    lineHeight: 17 * 1.5,
    textAlign: 'center',
  },
  comment: { borderRadius: 20, paddingVertical: 14, paddingHorizontal: 16 },
  repliesOff: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
    borderRadius: 18,
    paddingVertical: 6,
    paddingRight: 6,
    paddingLeft: 16,
  },
  input: {
    flex: 1,
    fontFamily: UI.regular,
    fontSize: 15,
    paddingVertical: 8,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
