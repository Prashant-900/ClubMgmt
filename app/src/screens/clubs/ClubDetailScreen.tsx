import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import {
  Avatar,
  BlockedState,
  Card,
  ContributionCard,
  EmptyState,
  Screen,
  SegmentedControl,
  Spinner,
  StatCard,
  StatGrid,
} from '../../components';
import { clubApi, contributionApi, memberApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { formatHours, getApiErrorMessage } from '../../utils/format';
import type {
  AppNavigation,
  RootStackParamList,
} from '../../navigation/types';
import type {
  ClubAnalytics,
  Contribution,
  EnrichedClub,
  LeaderboardEntry,
  User,
} from '../../types';
import { colors, spacing, typography } from '../../theme';

type TabValue = 'overview' | 'members' | 'contributions' | 'analytics';

const TABS = [
  { value: 'overview' as TabValue, label: 'Overview' },
  { value: 'members' as TabValue, label: 'Members' },
  { value: 'contributions' as TabValue, label: 'Contributions' },
  { value: 'analytics' as TabValue, label: 'Analytics' },
];

const MEDALS: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

/**
 * Club drill-down screen with four tabs: Overview (leaderboard), Members,
 * Contributions, Analytics. Mirrors the web club detail page structure.
 */
export function ClubDetailScreen() {
  const navigation = useNavigation<AppNavigation>();
  const route = useRoute<RouteProp<RootStackParamList, 'ClubDetail'>>();
  const { isAdmin, isCoordinator } = useAuth();
  const { clubId, clubName } = route.params;

  const [tab, setTab] = useState<TabValue>('overview');
  const [club, setClub] = useState<EnrichedClub | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [members, setMembers] = useState<User[]>([]);
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [analytics, setAnalytics] = useState<ClubAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canManage = isAdmin || isCoordinator;

  const load = useCallback(async () => {
    setError(null);
    try {
      const [clubsRes, lbRes, membersRes, contribRes, analyticsRes] =
        await Promise.allSettled([
          clubApi.listClubs(true),
          contributionApi.getLeaderboard({ clubId, limit: 20 }),
          memberApi.listMembers({ clubId, limit: 100 }),
          contributionApi.listContributions({ clubId, limit: 20 }),
          contributionApi.getClubAnalytics(clubId),
        ]);

      if (clubsRes.status === 'fulfilled' && clubsRes.value.data) {
        const found = (clubsRes.value.data as EnrichedClub[]).find(
          (c) => c.id === clubId,
        );
        setClub(found ?? null);
      }
      if (lbRes.status === 'fulfilled') {
        setLeaderboard(lbRes.value.data?.entries ?? []);
      }
      if (membersRes.status === 'fulfilled') {
        setMembers(membersRes.value.data?.members ?? []);
      }
      if (contribRes.status === 'fulfilled') {
        setContributions(contribRes.value.data?.contributions ?? []);
      }
      if (analyticsRes.status === 'fulfilled') {
        setAnalytics(analyticsRes.value.data ?? null);
      }
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not load this club.'));
    }
  }, [clubId]);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const title = club?.name ?? clubName ?? 'Club';

  if (loading) {
    return <Spinner fill label="Loading club…" />;
  }

  if (error) {
    return (
      <Screen>
        <Text style={styles.title}>{title}</Text>
        <BlockedState
          title="Could not load club"
          message={error}
          actionLabel="Retry"
          onAction={() => {
            setLoading(true);
            load().finally(() => setLoading(false));
          }}
        />
      </Screen>
    );
  }
  return (
    <Screen onRefresh={onRefresh} refreshing={refreshing}>
      <Text style={styles.title}>{title}</Text>
      {club?.description ? (
        <Text style={styles.description}>{club.description}</Text>
      ) : null}

      <StatGrid>
        <StatCard label="Members" value={club?.memberCount ?? members.length} />
        <StatCard
          label="Contributions"
          value={club?.contributionCount ?? 0}
        />
        <StatCard
          label="Approved hours"
          value={formatHours(analytics?.stats.totalApprovedHours ?? 0)}
          valueColor={colors.successEmphasis}
        />
        <StatCard
          label="Coordinator"
          value={club?.coordinatorName ?? '—'}
        />
      </StatGrid>

      <View style={styles.tabs}>
        <SegmentedControl options={TABS} value={tab} onChange={setTab} />
      </View>

      {tab === 'overview' ? (
        <OverviewTab entries={leaderboard} />
      ) : tab === 'members' ? (
        <MembersTab
          members={members}
          onOpen={(id) => navigation.navigate('MemberProfile', { id })}
        />
      ) : tab === 'contributions' ? (
        <ContributionsTab
          items={contributions}
          onOpen={(id) => navigation.navigate('ContributionDetail', { id })}
        />
      ) : (
        <AnalyticsTab
          canManage={canManage}
          onOpenFull={() =>
            navigation.navigate('Analytics', { scope: 'club', clubId })
          }
          analytics={analytics}
        />
      )}
    </Screen>
  );
}

// ── Tabs ────────────────────────────────────────────────────────────────────

function OverviewTab({ entries }: { entries: LeaderboardEntry[] }) {
  if (entries.length === 0) {
    return (
      <EmptyState
        title="No ranking yet"
        message="No contributions logged in this club yet."
      />
    );
  }
  return (
    <View style={styles.list}>
      <Text style={styles.sectionTitle}>Leaderboard</Text>
      {entries.map((entry) => (
        <Card key={entry.user.id} style={styles.row} compact>
          <View style={styles.rankCell}>
            <Text style={styles.rankText}>
              {MEDALS[entry.rank] ?? entry.rank}
            </Text>
          </View>
          <Avatar name={entry.user.name} size={36} />
          <View style={styles.memberCell}>
            <Text style={styles.memberName} numberOfLines={1}>
              {entry.user.name ?? entry.user.email}
            </Text>
            <Text style={styles.memberSub} numberOfLines={1}>
              {entry.totalContributions} contributions
            </Text>
          </View>
          <Text style={styles.hoursText}>
            {formatHours(entry.totalHours)}h
          </Text>
        </Card>
      ))}
    </View>
  );
}

function MembersTab({
  members,
  onOpen,
}: {
  members: User[];
  onOpen: (id: string) => void;
}) {
  if (members.length === 0) {
    return (
      <EmptyState
        title="No members yet"
        message="Assign members to this club to see them here."
      />
    );
  }
  return (
    <View style={styles.list}>
      {members.map((m) => (
        <Card
          key={m.id}
          style={styles.row}
          compact
          onPress={() => onOpen(m.id)}
        >
          <Avatar name={m.name} size={36} />
          <View style={styles.memberCell}>
            <Text style={styles.memberName} numberOfLines={1}>
              {m.name ?? m.email}
            </Text>
            <Text style={styles.memberSub} numberOfLines={1}>
              {m.role}
            </Text>
          </View>
        </Card>
      ))}
    </View>
  );
}

function ContributionsTab({
  items,
  onOpen,
}: {
  items: Contribution[];
  onOpen: (id: string) => void;
}) {
  if (items.length === 0) {
    return (
      <EmptyState
        title="No contributions yet"
        message="Nothing has been logged for this club yet."
      />
    );
  }
  return (
    <View style={styles.list}>
      {items.map((c) => (
        <ContributionCard
          key={c.id}
          contribution={c}
          showUser
          onPress={() => onOpen(c.id)}
        />
      ))}
    </View>
  );
}

function AnalyticsTab({
  analytics,
  canManage,
  onOpenFull,
}: {
  analytics: ClubAnalytics | null;
  canManage: boolean;
  onOpenFull: () => void;
}) {
  if (!analytics) {
    return (
      <EmptyState
        title="No analytics yet"
        message="There's nothing to summarise for this club yet."
      />
    );
  }
  return (
    <View style={styles.list}>
      <StatGrid>
        <StatCard
          label="Approved"
          value={analytics.stats.totalApproved}
          valueColor={colors.successEmphasis}
        />
        <StatCard
          label="Pending"
          value={analytics.stats.totalPending}
          valueColor={colors.warningEmphasis}
        />
        <StatCard
          label="Rejected"
          value={analytics.stats.totalRejected}
          valueColor={colors.dangerEmphasis}
        />
        <StatCard
          label="Hours"
          value={formatHours(analytics.stats.totalApprovedHours)}
        />
      </StatGrid>
      {canManage ? (
        <Card style={styles.linkCard} onPress={onOpenFull}>
          <Text style={styles.linkText}>Open full analytics →</Text>
        </Card>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  title: {
    ...typography.h2,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  description: {
    ...typography.small,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  tabs: {
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
  },
  list: {
    gap: spacing.sm,
  },
  sectionTitle: {
    ...typography.bodyStrong,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
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
  hoursText: {
    ...typography.body,
    color: colors.successEmphasis,
    fontWeight: '700',
  },
  linkCard: {
    marginTop: spacing.sm,
    alignItems: 'center',
  },
  linkText: {
    ...typography.body,
    color: colors.accentEmphasis,
    fontWeight: '600',
  },
});
