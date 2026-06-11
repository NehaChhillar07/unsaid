import React, { useCallback } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Svg, { Path } from 'react-native-svg';
import { relTime, type NotificationRow } from '@unsaid/tokens';
import { fetchNotifications, markNotificationsRead } from '@unsaid/api';
import { supabase } from '../../src/lib/supabase';
import { useTheme } from '../../src/theme/ThemeContext';
import { RoleBadge } from '../../src/components/RoleBadge';
import { SERIF, UI } from '../../src/theme/fonts';

function NotifIcon({ type, color }: { type: NotificationRow['type']; color: string }) {
  if (type === 'milestone') return <Text style={{ fontSize: 19 }}>🤍</Text>;
  if (type === 'same') return <Text style={{ fontSize: 19 }}>🫂</Text>;
  return (
    <Svg width={19} height={19} viewBox="0 0 24 24" fill="none">
      <Path d="M5 6h14v10H9l-4 3V6Z" stroke={color} strokeWidth={2} strokeLinejoin="round" />
    </Svg>
  );
}

function lineFor(n: NotificationRow): string {
  if (n.type === 'milestone') return `${n.payload.count ?? 0} people felt this`;
  if (n.type === 'same') return `${n.payload.count ?? 0} said “same” 🫂`;
  return 'a kind reply';
}

export default function NotificationsScreen() {
  const { world, dark, w, ink, inkSoft, surface } = useTheme();
  const qc = useQueryClient();

  const notifQ = useQuery({
    queryKey: ['notifications', world],
    queryFn: () => fetchNotifications(supabase, world),
  });

  // mark read whenever the screen gains focus
  useFocusEffect(
    useCallback(() => {
      markNotificationsRead(supabase, world)
        .then(() => qc.invalidateQueries({ queryKey: ['notifications', world] }))
        .catch(() => {});
    }, [world, qc]),
  );

  const rows = notifQ.data ?? [];

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.title, { color: ink }]}>felt</Text>
      <Text style={[styles.sub, { color: inkSoft }]}>
        gentle, batched. who your {world} world reached.
      </Text>
      <View style={{ gap: 10 }}>
        {rows.map((n) => (
          <View key={n.id} style={[styles.row, { backgroundColor: surface }]}>
            <View
              style={[
                styles.iconTile,
                { backgroundColor: dark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.7)' },
              ]}
            >
              <NotifIcon type={n.type} color={w.accent} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <View style={styles.rowHead}>
                <Text style={{ fontFamily: UI.semibold, fontSize: 14.5, color: ink, flexShrink: 1 }}>
                  {lineFor(n)}
                </Text>
                <Text style={{ fontFamily: UI.regular, fontSize: 11.5, color: inkSoft }}>
                  {relTime(n.created_at)}
                </Text>
              </View>
              {n.payload.snippet ? (
                <Text
                  numberOfLines={1}
                  style={{
                    fontFamily: SERIF.italic,
                    fontSize: 14.5,
                    color: inkSoft,
                    marginTop: 4,
                    lineHeight: 14.5 * 1.4,
                  }}
                >
                  “{n.payload.snippet}”
                </Text>
              ) : null}
              {n.type === 'comment' && n.payload.comment_body ? (
                <View
                  style={[
                    styles.detail,
                    { backgroundColor: dark ? 'rgba(255,255,255,0.09)' : 'rgba(255,255,255,0.8)' },
                  ]}
                >
                  <View style={{ marginBottom: 5 }}>
                    <RoleBadge
                      role={n.payload.comment_role ?? 'a stranger'}
                      color={ink}
                      bg={dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)'}
                    />
                  </View>
                  <Text
                    style={{
                      fontFamily: SERIF.regular,
                      fontSize: 14.5,
                      color: ink,
                      lineHeight: 14.5 * 1.4,
                    }}
                  >
                    {n.payload.comment_body}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        ))}
      </View>
      <Text style={[styles.footer, { color: inkSoft }]}>
        that's everything for now.{'\n'}we'll only nudge you once a day, if at all. 🤍
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 18, paddingBottom: 120 },
  title: {
    fontFamily: UI.bold,
    fontSize: 30,
    letterSpacing: 30 * -0.02,
    paddingTop: 6,
    paddingHorizontal: 4,
    paddingBottom: 4,
  },
  sub: {
    fontFamily: UI.regular,
    fontSize: 14,
    paddingHorizontal: 4,
    paddingBottom: 18,
  },
  row: {
    flexDirection: 'row',
    gap: 13,
    alignItems: 'flex-start',
    borderRadius: 20,
    paddingVertical: 15,
    paddingHorizontal: 16,
  },
  iconTile: {
    width: 40,
    height: 40,
    borderRadius: 13,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  detail: {
    marginTop: 9,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  footer: {
    textAlign: 'center',
    paddingTop: 26,
    paddingHorizontal: 20,
    fontFamily: UI.regular,
    fontSize: 13,
    lineHeight: 13 * 1.5,
  },
});
