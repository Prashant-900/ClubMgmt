import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Linking, StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import {
  BlockedState,
  Button,
  Card,
  CategoryBadge,
  Input,
  MetaField,
  MetaGrid,
  Screen,
  Spinner,
  StatusBadge,
} from '../../components';
import { contributionApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import {
  formatDateLong,
  formatDatePlain,
  formatHoursSuffix,
  getApiErrorMessage,
} from '../../utils/format';
import type { AppNavigation, RootStackParamList } from '../../navigation/types';
import type { Contribution } from '../../types';
import { colors, spacing, typography } from '../../theme';

type DetailRoute = RouteProp<RootStackParamList, 'ContributionDetail'>;

/** Full contribution detail with owner edit, moderator review, and admin delete. */
export function ContributionDetailScreen() {
  const navigation = useNavigation<AppNavigation>();
  const { params } = useRoute<DetailRoute>();
  const { id } = params;
  const { user } = useAuth();

  const [contribution, setContribution] = useState<Contribution | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const canModerate =
    user?.role === 'ADMIN' ||
    (user?.role === 'COORDINATOR' && contribution?.club?.id === user?.clubId);
  const canDelete = user?.role === 'ADMIN';
  const canEdit =
    Boolean(user) &&
    contribution?.user?.id === user?.id &&
    contribution?.status === 'PENDING';

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await contributionApi.getContributionById(id);
      if (res.data) setContribution(res.data);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to load contribution.'));
    }
  }, [id]);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  const handleApprove = useCallback(async () => {
    setActionLoading(true);
    try {
      const res = await contributionApi.approveContribution(id);
      if (res.data) setContribution(res.data);
    } catch (err) {
      Alert.alert('Approve failed', getApiErrorMessage(err, 'Failed to approve.'));
    } finally {
      setActionLoading(false);
    }
  }, [id]);

  const handleReject = useCallback(async () => {
    setActionLoading(true);
    try {
      const res = await contributionApi.rejectContribution(
        id,
        rejectReason.trim() || undefined,
      );
      if (res.data) setContribution(res.data);
      setShowRejectForm(false);
      setRejectReason('');
    } catch (err) {
      Alert.alert('Reject failed', getApiErrorMessage(err, 'Failed to reject.'));
    } finally {
      setActionLoading(false);
    }
  }, [id, rejectReason]);

  const confirmDelete = useCallback(() => {
    Alert.alert(
      'Delete contribution',
      'This contribution will be permanently removed. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true);
            try {
              await contributionApi.deleteContribution(id);
              navigation.goBack();
            } catch (err) {
              Alert.alert(
                'Delete failed',
                getApiErrorMessage(err, 'Failed to delete.'),
              );
              setActionLoading(false);
            }
          },
        },
      ],
    );
  }, [id, navigation]);

  if (loading) {
    return <Spinner fill label="Loading contribution…" />;
  }

  if (error && !contribution) {
    return (
      <Screen>
        <BlockedState
          title="Could not load contribution"
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

  if (!contribution) return null;

  const c = contribution;

  return (
    <Screen>
      <Card style={styles.card}>
        <View style={styles.topRow}>
          <StatusBadge status={c.status} />
          <CategoryBadge category={c.category} />
        </View>

        <Text style={styles.title}>{c.title}</Text>
        {c.description ? (
          <Text style={styles.description}>{c.description}</Text>
        ) : null}

        <View style={styles.divider} />

        <MetaGrid>
          <MetaField label="Hours" value={formatHoursSuffix(c.hours)} />
          <MetaField
            label="Date performed"
            value={formatDateLong(c.datePerformed)}
          />
          <MetaField
            label="Submitted by"
            value={c.user?.name ?? c.user?.email ?? 'Unknown'}
          />
          <MetaField label="Club" value={c.club?.name ?? null} />
          {c.approvedBy ? (
            <MetaField
              label={c.status === 'REJECTED' ? 'Reviewed by' : 'Approved by'}
              value={c.approvedBy.name ?? c.approvedBy.email}
            />
          ) : null}
          {c.approvedAt ? (
            <MetaField
              label={c.status === 'REJECTED' ? 'Reviewed at' : 'Approved at'}
              value={formatDateLong(c.approvedAt)}
            />
          ) : null}
        </MetaGrid>

        {c.attachmentUrl ? (
          <>
            <View style={styles.divider} />
            <Text style={styles.metaLabel}>Attachment</Text>
            <Text
              style={styles.link}
              onPress={() => Linking.openURL(c.attachmentUrl as string)}>
              View attachment
            </Text>
          </>
        ) : null}

        {c.status === 'REJECTED' && c.rejectionReason ? (
          <View style={styles.rejectionBox}>
            <Text style={styles.rejectionLabel}>Rejection reason</Text>
            <Text style={styles.rejectionText}>{c.rejectionReason}</Text>
          </View>
        ) : null}

        <View style={styles.divider} />
        <View style={styles.timestamps}>
          <Text style={styles.timestamp}>
            Submitted {formatDatePlain(c.createdAt)}
          </Text>
          <Text style={styles.timestamp}>
            Updated {formatDatePlain(c.updatedAt)}
          </Text>
        </View>
      </Card>

      {canEdit ? (
        <Button
          title="Edit contribution"
          variant="secondary"
          style={styles.spaced}
          onPress={() => navigation.navigate('EditContribution', { id: c.id })}
        />
      ) : null}

      {canModerate && c.status === 'PENDING' ? (
        <Card style={styles.spaced}>
          <Text style={styles.reviewTitle}>Review</Text>
          <View style={styles.reviewButtons}>
            <Button
              title="Approve"
              variant="success"
              loading={actionLoading}
              style={styles.flexBtn}
              onPress={handleApprove}
            />
            <Button
              title="Reject"
              variant="secondary"
              disabled={actionLoading}
              style={styles.flexBtn}
              onPress={() => setShowRejectForm((v) => !v)}
            />
          </View>

          {showRejectForm ? (
            <View style={styles.rejectForm}>
              <Input
                label="Reason for rejection (optional)"
                value={rejectReason}
                onChangeText={setRejectReason}
                placeholder="Let the contributor know what needs to change…"
                multiline
                numberOfLines={3}
              />
              <Button
                title="Confirm rejection"
                variant="danger"
                loading={actionLoading}
                onPress={handleReject}
              />
            </View>
          ) : null}
        </Card>
      ) : null}

      {canDelete ? (
        <Button
          title="Delete contribution"
          variant="danger"
          disabled={actionLoading}
          style={styles.spaced}
          onPress={confirmDelete}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    ...typography.h3,
    color: colors.text,
  },
  description: {
    ...typography.body,
    color: colors.textMuted,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.borderMuted,
    marginVertical: spacing.xs,
  },
  metaLabel: {
    ...typography.caption,
    color: colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },
  link: {
    ...typography.body,
    color: colors.accentEmphasis,
  },
  rejectionBox: {
    backgroundColor: colors.dangerSubtle,
    borderRadius: 6,
    padding: spacing.md,
    gap: spacing.xs,
  },
  rejectionLabel: {
    ...typography.caption,
    color: colors.dangerEmphasis,
    fontWeight: '600',
  },
  rejectionText: {
    ...typography.body,
    color: colors.text,
  },
  timestamps: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timestamp: {
    ...typography.caption,
    color: colors.textSubtle,
  },
  spaced: {
    marginTop: spacing.lg,
  },
  reviewTitle: {
    ...typography.bodyStrong,
    color: colors.text,
    marginBottom: spacing.md,
  },
  reviewButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  flexBtn: {
    flex: 1,
  },
  rejectForm: {
    marginTop: spacing.md,
    gap: spacing.md,
  },
});
