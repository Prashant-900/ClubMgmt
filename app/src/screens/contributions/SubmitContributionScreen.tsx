import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  ContributionForm,
  Screen,
  type ContributionFormValues,
} from '../../components';
import { useAuth } from '../../context/AuthContext';
import { clubApi, contributionApi } from '../../api';
import type { AppNavigation } from '../../navigation/types';
import type { Club } from '../../types';
import { getApiErrorMessage } from '../../utils/format';
import { colors, radius, spacing, typography } from '../../theme';

/**
 * Submit a new contribution. Mirrors frontend/app/contributions/submit/page.tsx:
 * admins additionally pick the owning club; coordinators and admins see the
 * auto-approve notice.
 */
export function SubmitContributionScreen() {
  const navigation = useNavigation<AppNavigation>();
  const { user, isAdmin, isCoordinator } = useAuth();

  const [clubs, setClubs] = useState<Club[]>([]);
  const [clubId, setClubId] = useState('');
  const [clubError, setClubError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.role !== 'ADMIN') return;
    let active = true;
    clubApi
      .listClubs()
      .then((res) => {
        if (active && res.data) setClubs(res.data as Club[]);
      })
      .catch(() => {
        // Non-fatal: admins can still submit once clubs load; leave empty.
      });
    return () => {
      active = false;
    };
  }, [user?.role]);

  const notice = useMemo(() => {
    if (isCoordinator || isAdmin) {
      return 'Your contributions are automatically approved.';
    }
    return undefined;
  }, [isAdmin, isCoordinator]);

  const showClubSelector = isAdmin && clubs.length > 0;

  async function handleSubmit(values: ContributionFormValues) {
    setFormError(null);

    if (showClubSelector && !clubId) {
      setClubError('Please select a club.');
      return;
    }
    setClubError(null);

    setSubmitting(true);
    try {
      await contributionApi.createContribution({
        ...values,
        ...(isAdmin && clubId ? { clubId } : {}),
      });
      navigation.navigate('Tabs', { screen: 'Contributions' });
    } catch (error) {
      setFormError(getApiErrorMessage(error, 'Could not submit contribution.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>Submit contribution</Text>
        <Text style={styles.subtitle}>Record a completed piece of work.</Text>
      </View>

      {formError ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{formError}</Text>
        </View>
      ) : null}

      {showClubSelector ? (
        <View style={styles.clubBlock}>
          <Text style={styles.fieldLabel}>Club</Text>
          <View style={styles.clubWrap}>
            {clubs.map((club) => {
              const active = club.id === clubId;
              return (
                <Text
                  key={club.id}
                  onPress={() => !submitting && setClubId(club.id)}
                  style={[styles.clubChip, active && styles.clubChipActive]}
                >
                  {club.name}
                </Text>
              );
            })}
          </View>
          {clubError ? <Text style={styles.clubError}>{clubError}</Text> : null}
        </View>
      ) : null}

      <ContributionForm
        submitLabel="Submit contribution"
        submitting={submitting}
        onSubmit={handleSubmit}
        notice={notice}
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
  clubBlock: {
    marginBottom: spacing.lg,
  },
  fieldLabel: {
    ...typography.small,
    color: colors.textMuted,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  clubWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  clubChip: {
    ...typography.small,
    color: colors.textMuted,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    overflow: 'hidden',
  },
  clubChipActive: {
    color: colors.white,
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  clubError: {
    ...typography.small,
    color: colors.dangerEmphasis,
    marginTop: spacing.sm,
  },
});
