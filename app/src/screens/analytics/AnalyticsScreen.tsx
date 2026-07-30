import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import {
  BlockedState,
  Card,
  ContributionCard,
  Screen,
  SectionHeader,
  SegmentedControl,
  Spinner,
  StatCard,
  StatGrid,
} from '../../components';
import { clubApi, contributionApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { formatHours, getApiErrorMessage } from '../../utils/format';
import type {
  AnalyticsScope,
  AppNavigation,
  RootStackParamList,
} from '../../navigation/types';
import type {
  CategoryStat,
  Club,
  ClubAnalytics,
  Contribution,
  GlobalAnalytics,
  TopClub,
  TopContributor,
  WeeklyTrendPoint,
} from '../../types';
import { colors, radius, spacing, typography } from '../../theme';

const CATEGORY_LABELS: Record<string, string> = {
  DEVELOPMENT: 'Development',
  WORKSHOP: 'Workshop',
  PRESENTATION: 'Presentation',
  DESIGN: 'Design',
  EVENT_SUPPORT: 'Event Support',
  DOCUMENTATION: 'Documentation',
  MEETING: 'Meeting',
  OTHER: 'Other',
};

function categoryLabel(category: string): string {
  return CATEGORY_LABELS[category] ?? category.replace(/_/g, ' ');
}

// ── Reusable pieces ───────────────────────────────────────────────────────────

/** A labelled horizontal progress bar (category / club distribution). */
function DistributionBar({
  label,
  hours,
  count,
  maxHours,
  color,
}: {
  label: string;
  hours: number;
  count?: number;
  maxHours: number;
  color: string;
}) {
  const pct = maxHours > 0 ? Math.round((hours / maxHours) * 100) : 0;
  return (
    <View style={styles.barBlock}>
      <View style={styles.barTop}>
        <Text style={styles.barLabel} numberOfLines={1}>
          {label}
        </Text>
        <Text style={styles.barMeta}>
          {formatHours(hours)} hrs{count != null ? ` · ${count}` : ''}
        </Text>
      </View>
      <View style={styles.barTrack}>
        <View
          style={[styles.barFill, { width: `${pct}%`, backgroundColor: color }]}
        />
      </View>
    </View>
  );
}

/** Ranked list row for top contributors / clubs. */
function RankRow({
  rank,
  name,
  sub,
  hours,
}: {
  rank: number;
  name: string;
  sub?: string | null;
  hours: number;
}) {
  const medal =
    rank === 1
      ? { bg: colors.warningSubtle, fg: colors.warningEmphasis }
      : rank === 2
      ? { bg: colors.neutralSubtle, fg: colors.textMuted }
      : rank === 3
      ? { bg: colors.dangerSubtle, fg: colors.dangerEmphasis }
      : { bg: colors.borderMuted, fg: colors.textSubtle };
  return (
    <View style={styles.rankRow}>
      <View style={[styles.rankBadge, { backgroundColor: medal.bg }]}>
        <Text style={[styles.rankNum, { color: medal.fg }]}>{rank}</Text>
      </View>
      <View style={styles.rankText}>
        <Text style={styles.rankName} numberOfLines={1}>
          {name}
        </Text>
        {sub ? (
          <Text style={styles.rankSub} numberOfLines={1}>
            {sub}
          </Text>
        ) : null}
      </View>
      <Text style={styles.rankHours}>{formatHours(hours)} hrs</Text>
    </View>
  );
}

/** Simple 8-week bar chart of approved hours. */
function WeeklyTrend({ points }: { points: WeeklyTrendPoint[] }) {
  const maxH = Math.max(...points.map((w) => Number(w.hours)), 1);
  return (
    <View>
      <View style={styles.trendRow}>
        {points.map((w, i) => {
          const pct = (Number(w.hours) / maxH) * 100;
          return (
            <View key={i} style={styles.trendCol}>
              <View
                style={[styles.trendBar, { height: `${Math.max(pct, 3)}%` }]}
              />
            </View>
          );
        })}
      </View>
      <View style={styles.trendAxis}>
        <Text style={styles.trendAxisText}>8 weeks ago</Text>
        <Text style={styles.trendAxisText}>This week</Text>
      </View>
    </View>
  );
}

function SummaryStats({
  totalApprovedHours,
  totalApproved,
  totalPending,
  totalRejected,
}: {
  totalApprovedHours: number;
  totalApproved: number;
  totalPending: number;
  totalRejected: number;
}) {
  return (
    <StatGrid>
      <StatCard
        label="Approved hours"
        value={formatHours(totalApprovedHours)}
        valueColor={colors.successEmphasis}
        hint="Total logged"
      />
      <StatCard
        label="Contributions"
        value={totalApproved}
        valueColor={colors.roleCoordinator}
        hint="Approved"
      />
      <StatCard
        label="Pending"
        value={totalPending}
        valueColor={colors.warningEmphasis}
        hint="Awaiting review"
      />
      <StatCard
        label="Rejected"
        value={totalRejected}
        valueColor={colors.dangerEmphasis}
        hint="Total"
      />
    </StatGrid>
  );
}

function CategorySection({ breakdown }: { breakdown: CategoryStat[] }) {
  if (breakdown.length === 0) return null;
  const maxHours = Math.max(...breakdown.map((c) => c.totalHours), 1);
  return (
    <Card style={styles.section}>
      <Text style={styles.sectionTitle}>Category breakdown</Text>
      {breakdown.map((c) => (
        <DistributionBar
          key={c.category}
          label={categoryLabel(c.category)}
          hours={c.totalHours}
          count={c.count}
          maxHours={maxHours}
          color={colors.successEmphasis}
        />
      ))}
    </Card>
  );
}

function ContributorsSection({ list }: { list: TopContributor[] }) {
  if (list.length === 0) return null;
  return (
    <Card style={styles.section}>
      <Text style={styles.sectionTitle}>Top contributors</Text>
      {list.map((entry, i) => (
        <RankRow
          key={entry.user?.id ?? i}
          rank={i + 1}
          name={entry.user?.name ?? entry.user?.email ?? 'Unknown'}
          sub={entry.user?.club?.name}
          hours={entry.totalHours}
        />
      ))}
    </Card>
  );
}

function ClubsSection({ list }: { list: TopClub[] }) {
  if (list.length === 0) return null;
  const maxHours = Math.max(...list.map((c) => c.totalHours), 1);
  return (
    <Card style={styles.section}>
      <Text style={styles.sectionTitle}>Top clubs</Text>
      {list.map((entry, i) => (
        <DistributionBar
          key={entry.club?.id ?? i}
          label={`${i + 1}. ${entry.club?.name ?? 'Unknown'}`}
          hours={entry.totalHours}
          maxHours={maxHours}
          color={colors.accentEmphasis}
        />
      ))}
    </Card>
  );
}

function TrendSection({ points }: { points: WeeklyTrendPoint[] }) {
  if (points.length === 0) return null;
  return (
    <Card style={styles.section}>
      <Text style={styles.sectionTitle}>Weekly trend</Text>
      <WeeklyTrend points={points} />
    </Card>
  );
}

function RecentSection({
  items,
  onOpen,
}: {
  items: Contribution[];
  onOpen: (c: Contribution) => void;
}) {
  if (items.length === 0) return null;
  return (
    <View style={styles.recentWrap}>
      <SectionHeader title="Recent activity" />
      {items.slice(0, 6).map((c) => (
        <ContributionCard
          key={c.id}
          contribution={c}
          showUser
          onPress={() => onOpen(c)}
        />
      ))}
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

/**
 * Analytics dashboard. Coordinators see their club; admins can view any club or
 * the global org-wide picture (with an optional club filter). Mirrors the web
 * ClubDashboard / GlobalDashboard.
 */
export function AnalyticsScreen() {
  const navigation = useNavigation<AppNavigation>();
  const route = useRoute<RouteProp<RootStackParamList, 'Analytics'>>();
  const { isAdmin } = useAuth();

  const defaultScope: AnalyticsScope = isAdmin ? 'global' : 'club';
  const scope: AnalyticsScope = route.params?.scope ?? defaultScope;
  const paramClubId = route.params?.clubId;

  const [clubs, setClubs] = useState<Club[]>([]);
  // Global scope only: which club to filter to ('' = all clubs).
  const [filterClubId, setFilterClubId] = useState<string>(paramClubId ?? '');

  const [clubData, setClubData] = useState<ClubAnalytics | null>(null);
  const [globalData, setGlobalData] = useState<GlobalAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Admin global scope: load clubs for the filter chips.
  useEffect(() => {
    if (scope !== 'global' || !isAdmin) return;
    let active = true;
    clubApi
      .listClubs()
      .then((res) => {
        if (active && res.data) setClubs(res.data as Club[]);
      })
      .catch(() => {
        // Non-fatal: the filter simply won't appear.
      });
    return () => {
      active = false;
    };
  }, [scope, isAdmin]);

  const load = useCallback(async () => {
    setError(null);
    try {
      if (scope === 'club') {
        const res = await contributionApi.getClubAnalytics(paramClubId);
        setClubData(res.data ?? null);
      } else {
        const res = await contributionApi.getGlobalAnalytics(
          filterClubId || undefined,
        );
        setGlobalData(res.data ?? null);
      }
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to load analytics.'));
    }
  }, [scope, paramClubId, filterClubId]);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const filterOptions = useMemo(
    () => [
      { value: '', label: 'All clubs' },
      ...clubs.map((c) => ({ value: c.id, label: c.name })),
    ],
    [clubs],
  );

  const openContribution = useCallback(
    (c: Contribution) => navigation.navigate('ContributionDetail', { id: c.id }),
    [navigation],
  );

  const title = scope === 'club' ? 'Club analytics' : 'Global analytics';

  if (loading) {
    return <Spinner fill label="Loading analytics…" />;
  }

  if (error) {
    return (
      <Screen>
        <Text style={styles.title}>{title}</Text>
        <BlockedState
          title="Could not load analytics"
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

  // ── Club scope ──
  if (scope === 'club') {
    if (!clubData) {
      return (
        <Screen>
          <Text style={styles.title}>{title}</Text>
          <BlockedState
            tone="neutral"
            title="No analytics yet"
            message="There's nothing to summarise for this club yet."
          />
        </Screen>
      );
    }
    return (
      <Screen onRefresh={onRefresh} refreshing={refreshing}>
        <Text style={styles.title}>{clubData.club?.name ?? title}</Text>
        <SummaryStats
          totalApprovedHours={clubData.stats.totalApprovedHours}
          totalApproved={clubData.stats.totalApproved}
          totalPending={clubData.stats.totalPending}
          totalRejected={clubData.stats.totalRejected}
        />
        <CategorySection breakdown={clubData.categoryBreakdown} />
        <ContributorsSection list={clubData.topContributors} />
        <TrendSection points={clubData.weeklyTrend} />
        <RecentSection
          items={clubData.recentContributions}
          onOpen={openContribution}
        />
      </Screen>
    );
  }

  // ── Global scope ──
  return (
    <Screen onRefresh={onRefresh} refreshing={refreshing}>
      <Text style={styles.title}>{title}</Text>

      {clubs.length > 0 ? (
        <View style={styles.filter}>
          <SegmentedControl
            options={filterOptions}
            value={filterClubId}
            onChange={setFilterClubId}
          />
        </View>
      ) : null}

      {!globalData ? (
        <BlockedState
          tone="neutral"
          title="No analytics yet"
          message="There's nothing to summarise yet."
        />
      ) : (
        <>
          <SummaryStats
            totalApprovedHours={globalData.stats.totalApprovedHours}
            totalApproved={globalData.stats.totalApproved}
            totalPending={globalData.stats.totalPending}
            totalRejected={globalData.stats.totalRejected}
          />
          {!filterClubId ? <ClubsSection list={globalData.topClubs} /> : null}
          <CategorySection breakdown={globalData.categoryBreakdown} />
          <ContributorsSection list={globalData.topContributors} />
          <TrendSection points={globalData.weeklyTrend} />
          <RecentSection
            items={globalData.recentContributions}
            onOpen={openContribution}
          />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    ...typography.h2,
    color: colors.text,
    marginBottom: spacing.lg,
  },
  filter: {
    marginBottom: spacing.lg,
  },
  section: {
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  sectionTitle: {
    ...typography.bodyStrong,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  barBlock: {
    gap: spacing.xs,
  },
  barTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  barLabel: {
    ...typography.small,
    color: colors.text,
    fontWeight: '600',
    flexShrink: 1,
  },
  barMeta: {
    ...typography.caption,
    color: colors.textMuted,
  },
  barTrack: {
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.borderMuted,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: radius.pill,
  },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  rankBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankNum: {
    ...typography.caption,
    fontWeight: '700',
  },
  rankText: {
    flex: 1,
  },
  rankName: {
    ...typography.small,
    color: colors.text,
    fontWeight: '600',
  },
  rankSub: {
    ...typography.caption,
    color: colors.textMuted,
  },
  rankHours: {
    ...typography.small,
    color: colors.successEmphasis,
    fontWeight: '700',
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.xs,
    height: 96,
  },
  trendCol: {
    flex: 1,
    height: '100%',
    justifyContent: 'flex-end',
  },
  trendBar: {
    width: '100%',
    borderTopLeftRadius: radius.sm,
    borderTopRightRadius: radius.sm,
    backgroundColor: colors.successEmphasis,
    minHeight: 2,
  },
  trendAxis: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  trendAxisText: {
    ...typography.caption,
    color: colors.textSubtle,
  },
  recentWrap: {
    marginTop: spacing.sm,
  },
});
