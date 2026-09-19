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

  const canDelete = user?.role === 'ADMIN';
  const canEdit = Boolean(user) && contribution?.user?.id === user?.id;

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
          <MetaField label="Domain" value={c.club?.name ?? null} />
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
});
