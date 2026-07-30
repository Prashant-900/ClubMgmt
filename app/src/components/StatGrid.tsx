import React, { Children, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { spacing } from '../theme';

/**
 * Wraps StatCards in a responsive row that flows onto multiple lines. Each card
 * flexes to fill; `minWidth` on StatCard keeps them readable when they wrap.
 */
export function StatGrid({ children }: { children: ReactNode }) {
  return <View style={styles.grid}>{Children.toArray(children)}</View>;
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
});
