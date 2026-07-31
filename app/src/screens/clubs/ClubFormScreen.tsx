import React, { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { Button, Card, Input, Screen } from '../../components';
import { clubApi } from '../../api';
import { getApiErrorMessage } from '../../utils/format';
import type { AppNavigation, RootStackParamList } from '../../navigation/types';
import { colors, spacing, typography } from '../../theme';

const CLUB_NAME_MAX = 100;
const CLUB_DESCRIPTION_MAX = 500;

/**
 * Create or edit a club. Admins only.
 *
 * When mode='create', shows a blank form.
 * When mode='edit', pre-fills with the existing club.
 */
export function ClubFormScreen() {
  const navigation = useNavigation<AppNavigation>();
  const route = useRoute<RouteProp<RootStackParamList, 'ClubForm'>>();
  const { mode, club } = route.params;

  const isEdit = mode === 'edit';

  const [name, setName] = useState(club?.name ?? '');
  const [description, setDescription] = useState(club?.description ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nameCount = name.length;
  const descCount = description.length;
  const nameValid = name.trim().length > 0 && nameCount <= CLUB_NAME_MAX;
  const descValid = descCount <= CLUB_DESCRIPTION_MAX;
  const canSubmit = nameValid && descValid;

  const handleSubmit = async () => {
    if (!canSubmit) return;

    const trimmedName = name.trim();
    const trimmedDesc = description.trim();

    setSubmitting(true);
    setError(null);

    try {
      if (isEdit && club) {
        await clubApi.updateClub(club.id, {
          name: trimmedName,
          ...(trimmedDesc ? { description: trimmedDesc } : {}),
        });
      } else {
        await clubApi.createClub({
          name: trimmedName,
          ...(trimmedDesc ? { description: trimmedDesc } : {}),
        });
      }
      navigation.goBack();
    } catch (err) {
      setError(
        getApiErrorMessage(
          err,
          isEdit ? 'Failed to update club' : 'Failed to create club',
        ),
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen>
      <Text style={styles.title}>{isEdit ? 'Edit club' : 'Create club'}</Text>

      <Card style={styles.form}>
        <Input
          label="Club name"
          value={name}
          onChangeText={setName}
          placeholder="e.g. GDG on Campus"
          maxLength={CLUB_NAME_MAX}
          autoFocus
        />
        <Text
          style={[
            styles.counter,
            nameCount > CLUB_NAME_MAX && styles.counterError,
          ]}
        >
          {nameCount}/{CLUB_NAME_MAX}
        </Text>

        <Input
          label="Description (optional)"
          value={description}
          onChangeText={setDescription}
          placeholder="What does this club do?"
          multiline
          numberOfLines={4}
          maxLength={CLUB_DESCRIPTION_MAX}
          containerStyle={styles.descField}
        />
        <Text
          style={[
            styles.counter,
            descCount > CLUB_DESCRIPTION_MAX && styles.counterError,
          ]}
        >
          {descCount}/{CLUB_DESCRIPTION_MAX}
        </Text>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <View style={styles.actions}>
          <Button
            title={isEdit ? 'Save' : 'Create'}
            onPress={handleSubmit}
            loading={submitting}
            disabled={!canSubmit}
          />
          <Button
            title="Cancel"
            onPress={() => navigation.goBack()}
            variant="secondary"
          />
        </View>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    ...typography.h2,
    color: colors.text,
    marginBottom: spacing.lg,
  },
  form: {
    gap: spacing.sm,
  },
  counter: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'right',
    marginTop: -spacing.xs,
  },
  counterError: {
    color: colors.dangerEmphasis,
  },
  descField: {
    marginTop: spacing.md,
  },
  errorText: {
    ...typography.small,
    color: colors.dangerEmphasis,
    backgroundColor: colors.dangerSubtle,
    borderRadius: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    marginTop: spacing.sm,
  },
  actions: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
});

