import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Card } from './ui';
import { colors, spacing, typography } from '../theme';

interface StatCardProps {
  label: string;
  value: string | number;
  /** Accent colour for the value (e.g. success for approved hours). */
  valueColor?: string;
  hint?: string;
}

/** Compact metric tile used across the dashboards and member profile. */
export function StatCard({ label, value, valueColor = colors.text, hint }: StatCardProps) {
  return (
    <Card compact style={styles.card}>
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
      <Text style={[styles.value, { color: valueColor }]} numberOfLines={1}>
        {value}
      </Text>
      {hint ? (
        <Text style={styles.hint} numberOfLines={1}>
          {hint}
        </Text>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 140,
  },
  label: {
    ...typography.caption,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  value: {
    ...typography.h2,
    marginTop: spacing.xs,
  },
  hint: {
    ...typography.caption,
    color: colors.textSubtle,
    marginTop: spacing.xs,
  },
});
