import React from 'react';
import { Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { colors, spacing } from '../../theme';

interface CardProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  /** Reduce internal padding for dense lists. */
  compact?: boolean;
}

/** Bordered surface panel matching the web's card styling. */
export function Card({ children, onPress, style, compact = false }: CardProps) {
  const content = (
    <View
      style={[styles.card, compact && styles.compact, style]}>
      {children}
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => pressed && styles.pressed}>
        {content}
      </Pressable>
    );
  }
  return content;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.canvas,
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    padding: spacing.lg,
    // Soft Google-style lift.
    shadowColor: '#202124',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  compact: {
    padding: spacing.md,
  },
  pressed: {
    opacity: 0.85,
  },
});
