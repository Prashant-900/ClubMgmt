import React, { useCallback, useEffect, useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import {
  Avatar,
  BlockedState,
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
  getApiErrorStatus,
  roleLabel,
} from '../../utils/format';
import type { AppNavigation, RootStackParamList } from '../../navigation/types';
import type {
  HeatmapResponse,
  MemberProfile,
  MemberStats,
} from '../../types';
import { colors, spacing, typography } from '../../theme';

const EMPTY_STATS: MemberStats = {
  totalContributions: 0,
  pendingCount: 0,
  approvedCount: 0,
  rejectedCount: 0,
  approvedHours: 0,
  recentContributions: [],
};

/** One member's identity, stats, activity heatmap, and recent contributions. */
export function MemberProfileScreen() {
  const navigation = useNavigation<AppNavigation>();
  const route = useRoute<RouteProp<RootStackParamList, 'MemberProfile'>>();
  const { id } = route.params;
  const { user } = useAuth();

  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [heatmap, setHeatmap] = useState<HeatmapResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<{ message: string; status: number | null } | null>(
    null,
  );
  const [heatmapError, setHeatmapError] = useState<string | null>(null);

  const isSelf = user?.id === id;

  const load = useCallback(async () => {
    setError(null);
    setHeatmapError(null);

    // One failing request must not blank the other half of the page.
    const [profileResult, heatmapResult] = await Promise.allSettled([
      memberApi.getMemberProfile(id),
      contributionApi.getContributionHeatmap({ userId: id }),
    ]);

    if (profileResult.status === 'fulfilled' && profileResult.value.success) {
      setProfile(profileResult.value.data ?? null);
    } else {
      const reason =
        profileResult.status === 'rejected'
          ? profileResult.reason
          : profileResult.value;
      setProfile(null);
      setError({
        message: getApiErrorMessage(
          reason,
          'Something went wrong loading this member.',
        ),
        status: getApiErrorStatus(reason),
      });
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
  }, [id]);

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
    return <Spinner fill label="Loading profile…" />;
  }

  if (error) {
    if (error.status === 403) {
      return (
        <Screen>
          <BlockedState
            tone="warning"
            title="Profile not available"
            message="You can only view members from your own club."
          />
        </Screen>
      );
    }
    if (error.status === 404) {
      return (
        <Screen>
          <BlockedState
            tone="warning"
            title="Member not found"
            message="No member exists with this ID. They may have been removed."
          />
        </Screen>
      );
    }
    return (
      <Screen>
        <BlockedState
          title="Could not load profile"
          message={error.message}
          actionLabel="Retry"
          onAction={() => {
            setLoading(true);
            load().finally(() => setLoading(false));
          }}
        />
      </Screen>
    );
  }

  if (!profile) {
    return null;
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
              {isSelf ? 'Your profile' : displayName}
            </Text>
            {isSelf ? (
              <Text style={styles.sub} numberOfLines={1}>
                {displayName}
              </Text>
            ) : null}
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
          label="Approved"
          value={stats.approvedCount}
          valueColor={colors.successEmphasis}
          hint="Reviewed"
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

      {/* Heatmap */}
      <SectionHeader title="Contribution activity" />
      {heatmapError ? (
        <BlockedState tone="danger" title="Activity unavailable" message={heatmapError} />
      ) : heatmap ? (
        <Card style={styles.heatmapCard}>
          <HeatmapGrid
            data={heatmap}
            subjectPrefix={isSelf ? 'you' : displayName}
          />
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
          <Text style={styles.muted}>
            {isSelf
              ? "You haven't logged any contributions yet."
              : "This member hasn't logged any contributions yet."}
          </Text>
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

      {/* Invite lineage */}
      {(profile.invitedBy || (profile.invitees && profile.invitees.length > 0)) && (
        <>
          <SectionHeader title="Invite lineage" />
          <Card style={styles.lineageCard}>
            {profile.invitedBy && (
              <View style={styles.lineageSection}>
                <Text style={styles.lineageLabel}>Invited by</Text>
                <View style={styles.lineageRow}>
                  <Avatar
                    name={profile.invitedBy.name}
                    email={profile.invitedBy.email}
                    role={profile.invitedBy.role}
                    size={32}
                  />
                  <View style={styles.lineageText}>
                    <Text style={styles.lineageName} numberOfLines={1}>
                      {profile.invitedBy.name ?? profile.invitedBy.email}
                    </Text>
                    <Text style={styles.lineageEmail} numberOfLines={1}>
                      {profile.invitedBy.email}
                    </Text>
                  </View>
                  <RoleBadge role={profile.invitedBy.role} />
                </View>
              </View>
            )}

            {profile.invitees && profile.invitees.length > 0 && (
              <View
                style={[
                  styles.lineageSection,
                  profile.invitedBy && styles.lineageSectionDivider,
                ]}
              >
                <Text style={styles.lineageLabel}>
                  Invited {profile.invitees.length}{' '}
                  {profile.invitees.length === 1 ? 'member' : 'members'}
                </Text>
                {profile.invitees.map((invitee) => (
                  <View key={invitee.id} style={styles.lineageRow}>
                    <Avatar
                      name={invitee.name}
                      email={invitee.email}
                      role={invitee.role}
                      size={32}
                    />
                    <View style={styles.lineageText}>
                      <Text style={styles.lineageName} numberOfLines={1}>
                        {invitee.name ?? invitee.email}
                      </Text>
                      <Text style={styles.lineageEmail} numberOfLines={1}>
                        {invitee.email}
                      </Text>
                    </View>
                    <RoleBadge role={invitee.role} />
                  </View>
                ))}
              </View>
            )}
          </Card>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
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
  sub: {
    ...typography.small,
    color: colors.textMuted,
    marginTop: 2,
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
  heatmapCard: {
    marginBottom: spacing.lg,
  },
  lineageCard: {
    marginBottom: spacing.lg,
  },
  lineageSection: {
    gap: spacing.sm,
  },
  lineageSectionDivider: {
    paddingTop: spacing.md,
    marginTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderMuted,
  },
  lineageLabel: {
    ...typography.small,
    color: colors.textMuted,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  lineageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  lineageText: {
    flex: 1,
    minWidth: 0,
  },
  lineageName: {
    ...typography.small,
    color: colors.text,
    fontWeight: '600',
  },
  lineageEmail: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
});
