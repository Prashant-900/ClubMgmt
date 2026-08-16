import React, { useCallback, useEffect, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import {
  Avatar,
  BlockedState,
  Card,
  ContributionCard,
  HeatmapGrid,
  ProfileWaveBanner,
  SectionHeader,
  Screen,
  Spinner,
  StatCard,
  StatGrid,
} from '../../components';
import { contributionApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { formatHours, getApiErrorMessage } from '../../utils/format';
import type { AppNavigation } from '../../navigation/types';
import type { Contribution, HeatmapResponse, LeaderboardEntry } from '../../types';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '../../theme';

interface MemberHomeData {
  contributions: Contribution[];
  approvedHours: number;
  approvedCount: number;
  pendingCount: number;
  rank: number | null;
}

/** Member / coordinator landing dashboard. */
export function MemberHome() {
  const navigation = useNavigation<AppNavigation>();
  const { user } = useAuth();
  const [data, setData] = useState<MemberHomeData | null>(null);
  const [heatmap, setHeatmap] = useState<HeatmapResponse | null>(null);
  const [heatmapError, setHeatmapError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setHeatmapError(null);
    const [contribRes, boardRes, heatmapRes] = await Promise.allSettled([
      contributionApi.listMyContributions({ limit: 100 }),
      contributionApi.getLeaderboard({ period: 'all', limit: 100 }),
      user?.id
        ? contributionApi.getContributionHeatmap({ userId: user.id })
        : Promise.reject(new Error('No user')),
    ]);

    if (
      contribRes.status !== 'fulfilled' ||
      !contribRes.value.success ||
      !contribRes.value.data
    ) {
      const reason =
        contribRes.status === 'rejected' ? contribRes.reason : contribRes.value;
      setError(getApiErrorMessage(reason, 'Could not load your dashboard.'));
      setData(null);
      setHeatmap(null);
      return;
    }

    const contributions = contribRes.value.data.contributions;
    const approved = contributions.filter((c) => c.status === 'APPROVED');
    const pending = contributions.filter((c) => c.status === 'PENDING');
    const approvedHours = approved.reduce((sum, c) => sum + c.hours, 0);

    let rank: number | null = null;
    if (
      boardRes.status === 'fulfilled' &&
      boardRes.value.success &&
      boardRes.value.data
    ) {
      const mine = boardRes.value.data.entries.find(
        (e: LeaderboardEntry) => e.user.id === user?.id,
      );
      rank = mine ? mine.rank : null;
    }

    setData({
      contributions,
      approvedHours,
      approvedCount: approved.length,
      pendingCount: pending.length,
      rank,
    });

    if (
      heatmapRes.status === 'fulfilled' &&
      heatmapRes.value.success &&
      heatmapRes.value.data
    ) {
      setHeatmap(heatmapRes.value.data);
      setHeatmapError(null);
    } else if (user?.id) {
      const reason =
        heatmapRes.status === 'rejected'
          ? heatmapRes.reason
          : heatmapRes.value;
      setHeatmap(null);
      setHeatmapError(getApiErrorMessage(reason, 'Failed to load activity'));
    } else {
      setHeatmap(null);
      setHeatmapError(null);
    }
  }, [user?.id]);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  if (loading) {
    return <Spinner fill label="Loading your dashboard…" />;
  }

  if (error || !data) {
    return (
      <Screen>
        <BlockedState
          title="Could not load dashboard"
          message={error ?? undefined}
          actionLabel="Retry"
          onAction={() => {
            setLoading(true);
            load().finally(() => setLoading(false));
          }}
        />
      </Screen>
    );
  }

  const recent = [...data.contributions]
    .sort((a, b) => b.datePerformed.localeCompare(a.datePerformed))
    .slice(0, 8);

  const displayName = user?.name || user?.email || '';
  const initials = (
    user?.name
      ? user.name.split(' ').map((w) => w[0]).join('')
      : user?.email?.[0] ?? '?'
  )
    .toUpperCase()
    .slice(0, 2);

  return (
    <Screen onRefresh={onRefresh} refreshing={refreshing}>
      {/* Google-vibe welcome banner — solid blue card with drifting
          green/red/yellow wave ribbons + white initials (mirrors web home). */}
      <ProfileWaveBanner
        initials={initials}
        onPress={() => navigation.navigate('Profile')}
      />
      <View style={styles.greeting}>
        <Text style={styles.hi}>Welcome back</Text>
        <Text style={styles.name} numberOfLines={1}>
          {displayName}
        </Text>
      </View>

      <StatGrid>
        <StatCard
          label="Total Hours"
          value={formatHours(data.approvedHours)}
          valueColor={colors.successEmphasis}
        />
        <StatCard
          label="Approved"
          value={data.approvedCount}
          valueColor={colors.accentEmphasis}
        />
        <StatCard
          label="Pending"
          value={data.pendingCount}
          valueColor={colors.warningEmphasis}
        />
        <StatCard
          label="Domain Rank"
          value={data.rank != null ? `#${data.rank}` : '—'}
          valueColor={colors.dangerEmphasis}
        />
      </StatGrid>

      {user?.club ? (
        <Card style={styles.clubCard} onPress={() => navigation.navigate('Members')}>
          <View style={styles.clubRow}>
            <Avatar name={user.club.name} size={40} />
            <View style={styles.clubText}>
              <Text style={styles.clubLabel}>Your domain</Text>
              <Text style={styles.clubName} numberOfLines={1}>
                {user.club.name}
              </Text>
            </View>
          </View>
        </Card>
      ) : (
        <BlockedState
          tone="neutral"
          title="No domain assigned yet"
          message="An administrator will assign you to a domain soon."
        />
      )}

      {heatmap ? (
        <>
          <SectionHeader title="Your contribution activity" />
          <Card style={styles.heatmapCard}>
            <HeatmapGrid data={heatmap} subjectPrefix="you" />
          </Card>
        </>
      ) : heatmapError ? (
        <>
          <SectionHeader title="Your contribution activity" />
          <BlockedState
            tone="danger"
            title="Activity unavailable"
            message={heatmapError}
          />
        </>
      ) : null}

      <SectionHeader title="Recent contributions" />
      {recent.length === 0 ? (
        <BlockedState
          tone="neutral"
          title="No contributions yet"
          message="Log your first contribution to start tracking your hours."
          actionLabel="Add contribution"
          onAction={() => navigation.navigate('SubmitContribution')}
        />
      ) : (
        recent.map((c) => (
          <ContributionCard
            key={c.id}
            contribution={c}
            onPress={() => navigation.navigate('ContributionDetail', { id: c.id })}
          />
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  greeting: {
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  hi: {
    ...typography.small,
    color: colors.textMuted,
  },
  name: {
    ...typography.h2,
    color: colors.text,
  },
  clubCard: {
    marginBottom: spacing.lg,
  },
  clubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  clubText: {
    flexShrink: 1,
  },
  clubLabel: {
    ...typography.caption,
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  clubName: {
    ...typography.h3,
    color: colors.text,
  },
  heatmapCard: {
    marginBottom: spacing.lg,
  },
});
