import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  Avatar,
  BlockedState,
  Card,
  EmptyState,
  Screen,
  SegmentedControl,
} from '../../components';
import { contributionApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { formatHours, getApiErrorMessage } from '../../utils/format';
import type { LeaderboardEntry, LeaderboardPeriod } from '../../types';
import { colors, spacing, typography } from '../../theme';

const PERIODS: { value: LeaderboardPeriod; label: string }[] = [
  { value: 'weekly', label: 'This week' },
  { value: 'monthly', label: 'This month' },
  { value: 'semester', label: 'Semester' },
  { value: 'all', label: 'All time' },
];

const MEDALS: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

/** Global / club leaderboard with a period segmented control. */
export function LeaderboardScreen() {
  const { user } = useAuth();
  const [period, setPeriod] = useState<LeaderboardPeriod>('all');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await contributionApi.getLeaderboard({ period, limit: 20 });
      setEntries(res.data?.entries ?? []);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not load the leaderboard.'));
      setEntries([]);
    }
  }, [period]);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  return (
    <Screen onRefresh={onRefresh} refreshing={refreshing}>
      <Text style={styles.title}>Leaderboard</Text>

      <SegmentedControl
        options={PERIODS}
        value={period}
        onChange={setPeriod}
      />

      <View style={styles.list}>
        {loading ? (
          Array.from({ length: 10 }).map((_, i) => (
            <View key={i} style={[styles.row, styles.skeletonRow]} />
          ))
        ) : error ? (
          <BlockedState
            title="Could not load leaderboard"
            message={error}
            actionLabel="Retry"
            onAction={() => {
              setLoading(true);
              load().finally(() => setLoading(false));
            }}
          />
        ) : entries.length === 0 ? (
          <EmptyState
            title="Nothing here yet"
            message="No contributions in this period yet."
          />
        ) : (
          entries.map((entry) => {
            const isMe = entry.user.id === user?.id;
            const isTop = entry.rank <= 3;
            return (
              <Card
                key={entry.user.id}
                style={[styles.row, isMe && styles.meRow]}
                compact
              >
                <View style={styles.rankCell}>
                  <Text style={styles.rankText}>
                    {MEDALS[entry.rank] ?? entry.rank}
                  </Text>
                </View>
                <Avatar name={entry.user.name} size={36} />
                <View style={styles.memberCell}>
                  <Text style={styles.memberName} numberOfLines={1}>
                    {entry.user.name}
                    {isMe ? ' (you)' : ''}
                  </Text>
                  <Text style={styles.memberSub} numberOfLines={1}>
                    {entry.user.club?.name ?? 'No domain'}
                  </Text>
                </View>
                <View style={styles.hoursCell}>
                  <Text
                    style={[styles.hoursText, isTop && styles.hoursTop]}
                  >
                    {formatHours(entry.totalHours)}h
                  </Text>
                  <Text style={styles.contribText}>
                    {entry.totalContributions} contrib.
                  </Text>
                </View>
              </Card>
            );
          })
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    ...typography.h2,
    color: colors.text,
    marginBottom: spacing.md,
  },
  list: {
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  skeletonRow: {
    height: 60,
    backgroundColor: colors.surface,
    opacity: 0.5,
  },
  meRow: {
    borderColor: colors.accentEmphasis,
    borderWidth: StyleSheet.hairlineWidth,
  },
  rankCell: {
    width: 28,
    alignItems: 'center',
  },
  rankText: {
    ...typography.body,
    color: colors.textMuted,
    fontWeight: '700',
  },
  memberCell: {
    flex: 1,
  },
  memberName: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  memberSub: {
    ...typography.caption,
    color: colors.textSubtle,
    marginTop: 2,
  },
  hoursCell: {
    alignItems: 'flex-end',
  },
  hoursText: {
    ...typography.body,
    color: colors.text,
    fontWeight: '700',
  },
  hoursTop: {
    color: colors.successEmphasis,
  },
  contribText: {
    ...typography.caption,
    color: colors.textSubtle,
    marginTop: 2,
  },
});
