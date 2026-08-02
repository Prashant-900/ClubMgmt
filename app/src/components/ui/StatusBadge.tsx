import React from 'react';
import { Badge } from './Badge';
import { colors, roleColor, statusColors } from '../../theme';
import type { ContributionStatus, Role } from '../../types';

const ROLE_CHIP: Record<Role, { fg: string; bg: string }> = {
  ADMIN: { fg: colors.dangerEmphasis, bg: colors.dangerSubtle },
  COORDINATOR: { fg: colors.accentEmphasis, bg: colors.accentSubtle },
  MEMBER: { fg: colors.successEmphasis, bg: colors.successSubtle },
};

export function RoleBadge({ role }: { role: Role }) {
  const chip = ROLE_CHIP[role] ?? {
    fg: roleColor(role),
    bg: colors.neutralSubtle,
  };
  return <Badge label={role} color={chip.fg} background={chip.bg} />;
}

export function StatusBadge({ status }: { status: ContributionStatus }) {
  const { fg, bg } = statusColors(status);
  return <Badge label={status} color={fg} background={bg} />;
}

export function CategoryBadge({ category }: { category: string }) {
  const label = category.replace(/_/g, ' ');
  return (
    <Badge
      label={label}
      color={colors.textMuted}
      background={colors.neutralSubtle}
    />
  );
}
