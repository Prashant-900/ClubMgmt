import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '../../theme';
import { GdscLoader } from './GdscLoader';

interface SpinnerProps {
  /** Center in the available space (fills flex). */
  fill?: boolean;
  label?: string;
  size?: 'small' | 'large';
}

/**
 * Loading indicator. Uses the GDSC 7-dot morph loader (same as the web app) so
 * loading states feel consistent across platforms. `size` maps to the loader
 * board scale: 'small' for inline spots, 'large' for full-screen fills.
 */
export function Spinner({ fill = false, label, size = 'large' }: SpinnerProps) {
  return (
    <View style={[styles.wrap, fill && styles.fill]}>
      <GdscLoader size={size === 'small' ? 0.4 : 0.7} />
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
