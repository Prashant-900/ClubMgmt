import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Card } from './ui';
import { StatusBadge, CategoryBadge } from './ui';
import { Avatar } from './Avatar';
import { colors, spacing, typography } from '../theme';
import { formatDateLong, formatHoursSuffix } from '../utils/format';
import type { Contribution } from '../types';

interface ContributionCardProps {
  contribution: Contribution;
  onPress?: () => void;
  /** Show the contributor identity row (used in club / member views). */
  showUser?: boolean;
}

/**
 * Summary card for a single contribution. Mirrors the web list-item: title +
 * status, optional contributor row, category / hours / date meta line.
 */
export function ContributionCard({ contribution, onPress, showUser = false }: ContributionCardProps) {
  const { title, category, hours, datePerformed, status, user } = contribution;
  return (
    <Card compact onPress={onPress} style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title} numberOfLines={2}>
          {title}
        </Text>
        <StatusBadge status={status} />
      </View>

      {showUser && user ? (
        <View style={styles.userRow}>
          <Avatar name={user.name} email={user.email} size={26} />
          <Text style={styles.userName} numberOfLines={1}>
            {user.name || user.email}
          </Text>
        </View>
      ) : null}

      <View style={styles.metaRow}>
        <CategoryBadge category={category} />
        <Text style={styles.meta} numberOfLines={1}>
          {formatHoursSuffix(hours)} · {formatDateLong(datePerformed)}
        </Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  title: {
    ...typography.bodyStrong,
    color: colors.text,
    flexShrink: 1,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  userName: {
    ...typography.small,
    color: colors.textMuted,
    flexShrink: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  meta: {
    ...typography.caption,
    color: colors.textMuted,
    flexShrink: 1,
    textAlign: 'right',
  },
});
