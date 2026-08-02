import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Card } from './ui';
import { colors, spacing, typography } from '../theme';

interface StatCardProps {
  label: string;
  value: string | number;
  /** Accent colour for the value + rail (e.g. success for approved hours). */
  valueColor?: string;
  hint?: string;
}

/** Compact metric tile used across the dashboards and member profile. Mirrors
 * the web redesign: white card with a coloured accent rail + dot. When no
 * explicit `valueColor` is given the rail/dot fall back to Google blue (never
 * gray) so the dashboards keep the colourful "Google vibe" of the web app. */
export function StatCard({ label, value, valueColor, hint }: StatCardProps) {
  // Rail + dot use the PURE Google hue (never gray, never orange). The amber
  // `warningEmphasis` is only ever used for value *text* (it needs contrast on
  // white) — the rail for a "yellow" card must be pure #FBBC05, not amber.
  const accent =
    valueColor === colors.warningEmphasis
      ? colors.warning // pure yellow #FBBC05 rail/dot
      : valueColor ?? colors.accent; // brand blue default, not gray
  const valueTextColor = valueColor ?? colors.text;
  return (
    <Card compact style={styles.card}>
      <View style={[styles.rail, { backgroundColor: accent }]} />
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
      <View style={styles.valueRow}>
        <View style={[styles.dot, { backgroundColor: accent }]} />
        <Text style={[styles.value, { color: valueTextColor }]} numberOfLines={1}>
          {value}
        </Text>
      </View>
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
    overflow: 'hidden',
  },
  rail: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  label: {
    ...typography.caption,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  value: {
    ...typography.h2,
  },
  hint: {
    ...typography.caption,
    color: colors.textSubtle,
    marginTop: spacing.xs,
  },
});
