import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import {
  BlockedState,
  Button,
  Card,
  ContributionForm,
  Screen,
  Spinner,
  type ContributionFormValues,
} from '../../components';
import { contributionApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { getApiErrorMessage, getApiErrorStatus } from '../../utils/format';
import type { AppNavigation, RootStackParamList } from '../../navigation/types';
import type { Contribution } from '../../types';
import { colors, radius, spacing, typography } from '../../theme';

type EditRoute = RouteProp<RootStackParamList, 'EditContribution'>;

/**
 * Edit a pending contribution. Mirrors
 * frontend/app/contributions/[id]/edit/page.tsx: only the owner may edit, and
 * only while the contribution is still PENDING. Non-owners and already-reviewed
 * contributions get a locked notice with the option to view the record.
 */
function toFormValues(c: Contribution): Partial<ContributionFormValues> {
  return {
    title: c.title,
    description: c.description ?? undefined,
    category: c.category,
    hours: c.hours,
    datePerformed: c.datePerformed.slice(0, 10),
    attachmentUrl: c.attachmentUrl ?? undefined,
  };
}

export function EditContributionScreen() {
  const navigation = useNavigation<AppNavigation>();
  const { params } = useRoute<EditRoute>();
  const { id } = params;
  const { user } = useAuth();

  const [contribution, setContribution] = useState<Contribution | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await contributionApi.getContributionById(id);
      if (res.data) setContribution(res.data);
    } catch (err) {
      const status = getApiErrorStatus(err);
      setError(
        status === 404
          ? 'This contribution no longer exists.'
          : getApiErrorMessage(err, 'Failed to load contribution.'),
      );
    }
  }, [id]);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  const handleSubmit = useCallback(
    async (values: ContributionFormValues) => {
      setFormError(null);
      setSubmitting(true);
      try {
        await contributionApi.updateContribution(id, {
          title: values.title,
          // Sent even when empty so the field can be cleared.
          description: values.description ?? '',
          category: values.category,
          hours: values.hours,
          datePerformed: values.datePerformed,
          ...(values.attachmentUrl
            ? { attachmentUrl: values.attachmentUrl }
            : { attachmentUrl: '' }),
        });
        navigation.navigate('ContributionDetail', { id });
      } catch (err) {
        setFormError(getApiErrorMessage(err, 'Could not save changes.'));
      } finally {
        setSubmitting(false);
      }
    },
    [id, navigation],
  );

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
  const isOwner = Boolean(user) && c.user?.id === user?.id;
  const canEdit = isOwner && c.status === 'PENDING';

  if (!canEdit) {
    const lockedMessage = !isOwner
      ? 'Only the member who submitted a contribution can edit it. You can still view the full record.'
      : c.status === 'APPROVED'
      ? 'This contribution has already been approved, so it can no longer be edited. Ask a coordinator if something needs to change.'
      : 'This contribution has already been rejected, so it can no longer be edited. Submit a new one with the corrected details.';

    return (
      <Screen>
        <View style={styles.header}>
          <Text style={styles.title}>Edit contribution</Text>
        </View>
        <Card style={styles.lockedCard}>
          <Text style={styles.lockedText}>{lockedMessage}</Text>
          <Button
            title="View contribution"
            variant="secondary"
            style={styles.lockedAction}
            onPress={() => navigation.navigate('ContributionDetail', { id })}
          />
        </Card>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>Edit contribution</Text>
        <Text style={styles.subtitle}>Update the details of your submission.</Text>
      </View>

      {formError ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{formError}</Text>
        </View>
      ) : null}

      <ContributionForm
        submitLabel="Save changes"
        submitting={submitting}
        onSubmit={handleSubmit}
        notice="Edits are only possible while this contribution is still pending review."
        initialValues={toFormValues(c)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.h2,
    color: colors.text,
  },
  subtitle: {
    ...typography.body,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  errorBox: {
    backgroundColor: colors.dangerSubtle,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.dangerEmphasis,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  errorText: {
    ...typography.small,
    color: colors.dangerEmphasis,
  },
  lockedCard: {
    gap: spacing.md,
  },
  lockedText: {
    ...typography.body,
    color: colors.textMuted,
  },
  lockedAction: {
    marginTop: spacing.xs,
  },
});
