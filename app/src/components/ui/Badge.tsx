import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors, radius, spacing } from '../../theme';

interface BadgeProps {
  label: string;
  /** Text color. */
  color?: string;
  /** Background color (usually a subtle/translucent variant). */
  background?: string;
  style?: ViewStyle;
}

/** Small pill label used for roles, statuses, and categories. */
export function Badge({
  label,
  color = colors.textMuted,
  background = colors.neutralSubtle,
  style,
}: BadgeProps) {
  return (
    <View style={[styles.badge, { backgroundColor: background }, style]}>
      <Text style={[styles.text, { color }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
});
