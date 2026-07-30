import React from 'react';
import { Badge } from './Badge';
import { colors, roleColor, statusColors } from '../../theme';
import type { ContributionStatus, Role } from '../../types';

export function RoleBadge({ role }: { role: Role }) {
  const color = roleColor(role);
  return (
    <Badge
      label={role}
      color={color}
      background={`${color}26` /* ~15% alpha */}
    />
  );
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
