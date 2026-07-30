import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Linking, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  Avatar,
  BlockedState,
  Button,
  Card,
  ContributionCard,
  HeatmapGrid,
  MetaField,
  MetaGrid,
  RoleBadge,
  Screen,
  SectionHeader,
  Spinner,
  StatCard,
  StatGrid,
} from '../../components';
import { contributionApi, memberApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import {
  formatDateLong,
  formatHours,
  getApiErrorMessage,
  roleLabel,
} from '../../utils/format';
import type { AppNavigation } from '../../navigation/types';
import type { HeatmapResponse, MemberProfile, MemberStats } from '../../types';
import { colors, spacing, typography } from '../../theme';

const EMPTY_STATS: MemberStats = {
  totalContributions: 0,
  pendingCount: 0,
  approvedCount: 0,
  rejectedCount: 0,
  approvedHours: 0,
  recentContributions: [],
};

/** The signed-in user's own profile, stats, activity, and account actions. */
export function ProfileScreen() {
  const navigation = useNavigation<AppNavigation>();
  const { user, isAdmin, isCoordinator, logout } = useAuth();

  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [heatmap, setHeatmap] = useState<HeatmapResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [heatmapError, setHeatmapError] = useState<string | null>(null);

  const userId = user?.id;

  const load = useCallback(async () => {
    if (!userId) return;
    setError(null);
    setHeatmapError(null);

    const [profileResult, heatmapResult] = await Promise.allSettled([
      memberApi.getMemberProfile(userId),
      contributionApi.getContributionHeatmap({ userId }),
    ]);

    if (profileResult.status === 'fulfilled' && profileResult.value.success) {
      setProfile(profileResult.value.data ?? null);
    } else {
      const reason =
        profileResult.status === 'rejected'
          ? profileResult.reason
          : profileResult.value;
      setProfile(null);
      setError(getApiErrorMessage(reason, 'Could not load your profile.'));
    }

    if (heatmapResult.status === 'fulfilled' && heatmapResult.value.success) {
      setHeatmap(heatmapResult.value.data ?? null);
    } else {
      const reason =
        heatmapResult.status === 'rejected'
          ? heatmapResult.reason
          : heatmapResult.value;
      setHeatmap(null);
      setHeatmapError(getApiErrorMessage(reason, 'Failed to load activity'));
    }
  }, [userId]);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const confirmLogout = () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: logout },
    ]);
  };

  if (loading) {
    return <Spinner fill label="Loading your profile…" />;
  }

  if (error || !profile) {
    return (
      <Screen>
        <Text style={styles.title}>Your profile</Text>
        <BlockedState
          title="Could not load profile"
          message={error ?? 'Something went wrong.'}
          actionLabel="Retry"
          onAction={() => {
            setLoading(true);
            load().finally(() => setLoading(false));
          }}
        />
        <Button
          title="Sign out"
          onPress={confirmLogout}
          variant="danger"
          style={styles.logout}
        />
      </Screen>
    );
  }

  const stats = profile.stats ?? EMPTY_STATS;
  const displayName = profile.name ?? profile.email;

  return (
    <Screen onRefresh={onRefresh} refreshing={refreshing}>
      {/* Identity */}
      <Card style={styles.identityCard}>
        <View style={styles.identityRow}>
          <Avatar
            name={profile.name}
            email={profile.email}
            role={profile.role}
            size={56}
          />
          <View style={styles.identityText}>
            <Text style={styles.name} numberOfLines={2}>
              {displayName}
            </Text>
            <View style={styles.badgeRow}>
              <RoleBadge role={profile.role} />
              {!profile.isVerified ? (
                <View style={styles.unverified}>
                  <Text style={styles.unverifiedText}>Unverified</Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>

        <View style={styles.divider} />

        <MetaGrid>
          <MetaField label="Email">
            <Text
              style={styles.link}
              onPress={() => Linking.openURL(`mailto:${profile.email}`)}
              numberOfLines={1}
            >
              {profile.email}
            </Text>
          </MetaField>
          <MetaField label="Phone">
            {profile.phone ? (
              <Text
                style={styles.link}
                onPress={() => Linking.openURL(`tel:${profile.phone}`)}
                numberOfLines={1}
              >
                {profile.phone}
              </Text>
            ) : (
              <Text style={styles.muted}>Not provided</Text>
            )}
          </MetaField>
          <MetaField label="Role" value={roleLabel(profile.role)} />
          <MetaField
            label="Club"
            value={profile.club?.name ?? 'No club assigned'}
          />
          <MetaField label="Joined" value={formatDateLong(profile.createdAt)} />
        </MetaGrid>
      </Card>

      {/* Stats */}
      <StatGrid>
        <StatCard
          label="Approved hours"
          value={formatHours(stats.approvedHours)}
          valueColor={colors.successEmphasis}
          hint="Credited"
        />
        <StatCard
          label="Contributions"
          value={stats.totalContributions}
          valueColor={colors.roleCoordinator}
          hint="All time"
        />
        <StatCard
          label="Pending"
          value={stats.pendingCount}
          valueColor={colors.warningEmphasis}
          hint="Awaiting review"
        />
        <StatCard
          label="Rejected"
          value={stats.rejectedCount}
          valueColor={colors.dangerEmphasis}
          hint="Needs rework"
        />
      </StatGrid>

      {/* Management shortcuts */}
      {isAdmin || isCoordinator ? (
        <View style={styles.shortcuts}>
          <Button
            title="Invite links"
            onPress={() => navigation.navigate('Invites')}
            variant="secondary"
          />
          <Button
            title={isAdmin ? 'View analytics' : 'Club analytics'}
            onPress={() =>
              navigation.navigate('Analytics', {
                scope: isAdmin ? 'global' : 'club',
              })
            }
            variant="secondary"
          />
        </View>
      ) : null}

      {/* Heatmap */}
      <SectionHeader title="Your contribution activity" />
      {heatmapError ? (
        <BlockedState
          tone="danger"
          title="Activity unavailable"
          message={heatmapError}
        />
      ) : heatmap ? (
        <Card style={styles.heatmapCard}>
          <HeatmapGrid data={heatmap} subjectPrefix="you" />
        </Card>
      ) : (
        <Card style={styles.heatmapCard}>
          <Text style={styles.muted}>No contribution history yet.</Text>
        </Card>
      )}

      {/* Recent contributions */}
      <SectionHeader title="Recent contributions" />
      {stats.recentContributions.length === 0 ? (
        <Card>
          <Text style={styles.muted}>You haven't logged any contributions yet.</Text>
        </Card>
      ) : (
        stats.recentContributions.map((c) => (
          <ContributionCard
            key={c.id}
            contribution={c}
            onPress={() => navigation.navigate('ContributionDetail', { id: c.id })}
          />
        ))
      )}

      {/* Account */}
      <Button
        title="Sign out"
        onPress={confirmLogout}
        variant="danger"
        style={styles.logout}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    ...typography.h2,
    color: colors.text,
    marginBottom: spacing.lg,
  },
  identityCard: {
    marginBottom: spacing.lg,
  },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  identityText: {
    flex: 1,
  },
  name: {
    ...typography.h2,
    color: colors.text,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
    flexWrap: 'wrap',
  },
  unverified: {
    backgroundColor: colors.warningSubtle,
    borderColor: `${colors.warningEmphasis}66`,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  unverifiedText: {
    ...typography.caption,
    color: colors.warningEmphasis,
    fontWeight: '600',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.borderMuted,
    marginTop: spacing.lg,
  },
  link: {
    ...typography.body,
    color: colors.roleCoordinator,
  },
  muted: {
    ...typography.body,
    color: colors.textMuted,
  },
  shortcuts: {
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  heatmapCard: {
    marginBottom: spacing.lg,
  },
  logout: {
    marginTop: spacing.xl,
  },
});
