import React, { type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '../theme';

interface MetaFieldProps {
  label: string;
  /** Plain text value; use `children` instead for links / badges. */
  value?: string | null;
  children?: ReactNode;
}

/** Label-over-value pair used in the contribution / member meta grids. */
export function MetaField({ label, value, children }: MetaFieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
      {children ?? (
        <Text style={styles.value} numberOfLines={2}>
          {value && value.length > 0 ? value : '—'}
        </Text>
      )}
    </View>
  );
}

/** Two-column wrapper for MetaFields. */
export function MetaGrid({ children }: { children: ReactNode }) {
  return <View style={styles.grid}>{children}</View>;
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.md,
    marginHorizontal: -spacing.sm,
  },
  field: {
    width: '50%',
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.md,
  },
  label: {
    ...typography.caption,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  value: {
    ...typography.body,
    color: colors.text,
  },
});
