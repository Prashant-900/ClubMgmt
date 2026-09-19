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
  User,
} from '../../types';
import { colors, spacing, typography } from '../../theme';

type TabValue = 'members' | 'contributions' | 'analytics';

const TABS = [
  { value: 'members' as TabValue, label: 'Members' },
  { value: 'contributions' as TabValue, label: 'Contributions' },
  { value: 'analytics' as TabValue, label: 'Analytics' },
];

/**
 * Club drill-down screen with four tabs: Overview (leaderboard), Members,
 * Contributions, Analytics. Mirrors the web club detail page structure.
 */
export function ClubDetailScreen() {
  const navigation = useNavigation<AppNavigation>();
  const route = useRoute<RouteProp<RootStackParamList, 'ClubDetail'>>();
  const { isAdmin, isCoordinator } = useAuth();
  const { clubId, clubName } = route.params;

  const [tab, setTab] = useState<TabValue>('members');
  const [club, setClub] = useState<EnrichedClub | null>(null);
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
      const [clubsRes, membersRes, contribRes, analyticsRes] =
        await Promise.allSettled([
          clubApi.listClubs(true),
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
      setError(getApiErrorMessage(err, 'Could not load this domain.'));
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

  const title = club?.name ?? clubName ?? 'Domain';

  if (loading) {
    return <Spinner fill label="Loading domain…" />;
  }

  if (error) {
    return (
      <Screen>
        <Text style={styles.title}>{title}</Text>
        <BlockedState
          title="Could not load domain"
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
          label="Total hours"
          value={formatHours(analytics?.stats.totalHours ?? 0)}
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

      {tab === 'members' ? (
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
        message="Assign members to this domain to see them here."
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
        message="Nothing has been logged for this domain yet."
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
        message="There's nothing to summarise for this domain yet."
      />
    );
  }
  return (
    <View style={styles.list}>
      <StatGrid>
        <StatCard
          label="Contributions"
          value={analytics.stats.totalContributions}
          valueColor={colors.successEmphasis}
        />
        <StatCard
          label="Total hours"
          value={formatHours(analytics.stats.totalHours)}
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
