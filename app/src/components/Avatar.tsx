import React, { useMemo } from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { colors, radius } from '../theme';
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
 * role-coloured member chips) using SOLID opaque chips — no alpha, so the
 * avatar never lets the page bleed through on a light background.
 */
const ROLE_CHIP: Record<Role, { fg: string; bg: string }> = {
  ADMIN: { fg: colors.dangerEmphasis, bg: colors.dangerSubtle },
  COORDINATOR: { fg: colors.accentEmphasis, bg: colors.accentSubtle },
  MEMBER: { fg: colors.successEmphasis, bg: colors.successSubtle },
};

export function Avatar({ name, email, role, size = 40, style }: AvatarProps) {
  const initials = useMemo(() => initialsFor(name, email), [name, email]);
  const chip = role ? ROLE_CHIP[role] : { fg: colors.textMuted, bg: colors.neutralSubtle };

  return (
    <View
      style={[
        styles.base,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: chip.bg,
          borderColor: colors.borderMuted,
        },
        style,
      ]}
    >
      <Text
        style={[styles.text, { color: chip.fg, fontSize: Math.round(size * 0.4) }]}
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
