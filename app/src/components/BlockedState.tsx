import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from './ui';
import { colors, radius, spacing, typography } from '../theme';

type Tone = 'warning' | 'danger' | 'neutral';

interface BlockedStateProps {
  title: string;
  message?: string;
  tone?: Tone;
  actionLabel?: string;
  onAction?: () => void;
}

const TONE_COLORS: Record<Tone, { fg: string; bg: string }> = {
  warning: { fg: colors.warningEmphasis, bg: colors.warningSubtle },
  danger: { fg: colors.dangerEmphasis, bg: colors.dangerSubtle },
  neutral: { fg: colors.textMuted, bg: colors.neutralSubtle },
};

/**
 * Full-panel error / access notice used for 403 / 404 / load failures, mirroring
 * the web member-profile BlockedState. Centred card with a tinted border.
 */
export function BlockedState({
  title,
  message,
  tone = 'danger',
  actionLabel,
  onAction,
}: BlockedStateProps) {
  const palette = TONE_COLORS[tone];
  return (
    <View style={styles.wrap}>
      <View style={[styles.card, { backgroundColor: palette.bg, borderColor: `${palette.fg}55` }]}>
        <Text style={[styles.title, { color: palette.fg }]}>{title}</Text>
        {message ? <Text style={styles.message}>{message}</Text> : null}
        {actionLabel && onAction ? (
          <Button
            title={actionLabel}
            onPress={onAction}
            variant="secondary"
            fullWidth={false}
            style={styles.action}
          />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
  },
  card: {
    width: '100%',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: 'center',
  },
  title: {
    ...typography.h3,
    textAlign: 'center',
  },
  message: {
    ...typography.small,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  action: {
    marginTop: spacing.lg,
  },
});
