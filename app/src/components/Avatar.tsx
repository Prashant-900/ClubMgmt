import React, { useMemo } from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { colors, radius, roleColor } from '../theme';
import type { Role } from '../types';

interface AvatarProps {
  name?: string | null;
  email?: string | null;
  role?: Role;
  size?: number;
  style?: ViewStyle;
}

/** Derive up to two initials from a name (falling back to the email local-part). */
function initialsFor(name?: string | null, email?: string | null): string {
  const source = (name && name.trim()) || (email ? email.split('@')[0] : '');
  if (!source) return '?';
  const parts = source.split(/[\s._-]+/).filter(Boolean);
  if (parts.length === 0) return source.slice(0, 2).toUpperCase();
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Circular initials avatar. Tinted by role when provided (mirrors the web's
 * role-coloured member chips), otherwise a neutral surface.
 */
export function Avatar({ name, email, role, size = 40, style }: AvatarProps) {
  const initials = useMemo(() => initialsFor(name, email), [name, email]);
  const tint = role ? roleColor(role) : colors.textMuted;

  return (
    <View
      style={[
        styles.base,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: `${tint}26`,
          borderColor: `${tint}55`,
        },
        style,
      ]}
    >
      <Text
        style={[styles.text, { color: tint, fontSize: Math.round(size * 0.4) }]}
        numberOfLines={1}
      >
        {initials}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.pill,
  },
  text: {
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
