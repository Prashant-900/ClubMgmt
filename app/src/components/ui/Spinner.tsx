import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '../../theme';

interface SpinnerProps {
  /** Center in the available space (fills flex). */
  fill?: boolean;
  label?: string;
  size?: 'small' | 'large';
}

export function Spinner({ fill = false, label, size = 'large' }: SpinnerProps) {
  return (
    <View style={[styles.wrap, fill && styles.fill]}>
      <ActivityIndicator size={size} color={colors.accent} />
      {label ? <Text style={styles.label}>{label}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  fill: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  label: {
    ...typography.small,
    color: colors.textMuted,
    marginTop: spacing.md,
  },
});
