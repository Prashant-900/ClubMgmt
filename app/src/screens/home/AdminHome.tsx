import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  BlockedState,
  Button,
  Card,
  SectionHeader,
  Screen,
  Spinner,
  StatCard,
  StatGrid,
} from '../../components';
import { clubApi, contributionApi, memberApi } from '../../api';
import { formatHours, getApiErrorMessage } from '../../utils/format';
import type { AppNavigation } from '../../navigation/types';
import type { EnrichedClub } from '../../types';
import { colors, spacing, typography } from '../../theme';

interface AdminHomeData {
  clubs: EnrichedClub[];
  totalMembers: number;
  unassignedMembers: number;
  pendingApprovals: number;
  totalHours: number;
}

function totalFromResult(
  res: PromiseSettledResult<{
    success: boolean;
    data?: { pagination: { total: number } };
  }>,
): number {
  if (res.status === 'fulfilled' && res.value.success && res.value.data) {
    return res.value.data.pagination.total;
  }
  return 0;
}

/** Administrator landing dashboard — org-wide counts and club drill-in. */
export function AdminHome() {
  const navigation = useNavigation<AppNavigation>();
  const [data, setData] = useState<AdminHomeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const [clubsRes, membersRes, unassignedRes, pendingRes, analyticsRes] =
      await Promise.allSettled([
        clubApi.listClubs(true),
        memberApi.listMembers({ limit: 1 }),
        memberApi.listMembers({ clubStatus: 'unassigned', limit: 1 }),
        contributionApi.listContributions({ status: 'PENDING', limit: 1 }),
        contributionApi.getGlobalAnalytics(),
      ]);

    if (
      clubsRes.status !== 'fulfilled' ||
      !clubsRes.value.success ||
      !clubsRes.value.data
    ) {
      const reason =
        clubsRes.status === 'rejected' ? clubsRes.reason : clubsRes.value;
      setError(getApiErrorMessage(reason, 'Could not load the admin dashboard.'));
      setData(null);
      return;
    }

    const totalHours =
      analyticsRes.status === 'fulfilled' &&
      analyticsRes.value.success &&
      analyticsRes.value.data
        ? analyticsRes.value.data.stats.totalApprovedHours
        : 0;

    setData({
      clubs: clubsRes.value.data as EnrichedClub[],
      totalMembers: totalFromResult(membersRes),
      unassignedMembers: totalFromResult(unassignedRes),
      pendingApprovals: totalFromResult(pendingRes),
      totalHours,
    });
  }, []);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const handleEditClub = useCallback(
    (club: EnrichedClub) => {
      navigation.navigate('ClubForm', {
        mode: 'edit',
        club: {
          id: club.id,
          name: club.name,
          description: club.description ?? undefined,
        },
      });
    },
    [navigation],
  );

  const handleDeleteClub = useCallback((club: EnrichedClub) => {
    Alert.alert(
      'Delete club',
      `Delete "${club.name}"? This removes the club and unassigns its members. This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await clubApi.deleteClub(club.id);
              setData((prev) =>
                prev
                  ? { ...prev, clubs: prev.clubs.filter((c) => c.id !== club.id) }
                  : prev,
              );
            } catch (err) {
              Alert.alert('Error', getApiErrorMessage(err, 'Failed to delete club.'));
            }
          },
        },
      ],
    );
  }, []);

  if (loading) {
    return <Spinner fill label="Loading admin dashboard…" />;
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

  return (
    <Screen onRefresh={onRefresh} refreshing={refreshing}>
      <Text style={styles.title}>Overview</Text>

      <StatGrid>
        <StatCard
          label="Total Clubs"
          value={data.clubs.length}
          valueColor={colors.accentEmphasis}
        />
        <StatCard
          label="Members"
          value={data.totalMembers}
          valueColor={colors.roleMember}
        />
        <StatCard
          label="Pending Users"
          value={data.unassignedMembers}
          valueColor={colors.warningEmphasis}
        />
        <StatCard
          label="Pending Approvals"
          value={data.pendingApprovals}
          valueColor={colors.dangerEmphasis}
        />
        <StatCard
          label="Total Hours"
          value={formatHours(data.totalHours)}
          valueColor={colors.successEmphasis}
        />
      </StatGrid>

      <View style={styles.actions}>
        <Button
          title="Global analytics"
          variant="secondary"
          size="sm"
          fullWidth={false}
          onPress={() => navigation.navigate('Analytics', { scope: 'global' })}
        />
        <Button
          title="Invites"
          variant="secondary"
          size="sm"
          fullWidth={false}
          onPress={() => navigation.navigate('Invites')}
        />
      </View>

      <SectionHeader
        title="Clubs"
        subtitle={`${data.clubs.length} total`}
        action={
          <Button
            title="New club"
            size="sm"
            fullWidth={false}
            onPress={() => navigation.navigate('ClubForm', { mode: 'create' })}
          />
        }
      />
      {data.clubs.length === 0 ? (
        <BlockedState
          tone="neutral"
          title="No clubs yet"
          message="Create a club to start assigning members."
        />
      ) : (
        data.clubs.map((club) => (
          <Card
            key={club.id}
            style={styles.clubCard}
            onPress={() =>
              navigation.navigate('ClubDetail', {
                clubId: club.id,
                clubName: club.name,
              })
            }
          >
            <Text style={styles.clubName} numberOfLines={1}>
              {club.name}
            </Text>
            <Text style={styles.clubMeta}>
              {club.memberCount} members · {club.contributionCount} contributions
            </Text>
            <Text style={styles.clubCoord} numberOfLines={1}>
              {club.coordinatorName
                ? `Coordinator: ${club.coordinatorName}`
                : 'No coordinator assigned'}
            </Text>
            <View style={styles.clubActions}>
              <Pressable
                hitSlop={8}
                onPress={() => handleEditClub(club)}
                style={styles.clubAction}
              >
                <Text style={styles.clubActionText}>Edit</Text>
              </Pressable>
              <Pressable
                hitSlop={8}
                onPress={() => handleDeleteClub(club)}
                style={styles.clubAction}
              >
                <Text style={styles.clubActionDanger}>Delete</Text>
              </Pressable>
            </View>
          </Card>
        ))
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
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  clubCard: {
    marginBottom: spacing.sm,
  },
  clubName: {
    ...typography.h3,
    color: colors.text,
  },
  clubMeta: {
    ...typography.small,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  clubCoord: {
    ...typography.caption,
    color: colors.textSubtle,
    marginTop: spacing.xs,
  },
  clubActions: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  clubAction: {
    paddingVertical: spacing.xs,
  },
  clubActionText: {
    ...typography.small,
    color: colors.accentEmphasis,
    fontWeight: '600',
  },
  clubActionDanger: {
    ...typography.small,
    color: colors.dangerEmphasis,
    fontWeight: '600',
  },
});
