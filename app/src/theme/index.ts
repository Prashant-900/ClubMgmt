import { colors, heatmapRamp } from './colors';
import { radius, spacing, typography } from './layout';
import type { Role, ContributionStatus } from '../types';

export { colors, heatmapRamp, radius, spacing, typography };

/** Accent color for a given role badge. */
export function roleColor(role: Role): string {
  switch (role) {
    case 'ADMIN':
      return colors.roleAdmin;
    case 'COORDINATOR':
      return colors.roleCoordinator;
    case 'MEMBER':
    default:
      return colors.roleMember;
  }
}

/** {fg, bg} colors for a contribution-status badge. */
export function statusColors(status: ContributionStatus): {
  fg: string;
  bg: string;
} {
  switch (status) {
    case 'APPROVED':
      return { fg: colors.successEmphasis, bg: colors.successSubtle };
    case 'REJECTED':
      return { fg: colors.dangerEmphasis, bg: colors.dangerSubtle };
    case 'PENDING':
    default:
      return { fg: colors.warningEmphasis, bg: colors.warningSubtle };
  }
}

/** Map an intensity level (0–4) to a heatmap color. */
export function heatmapColor(level: number): string {
  const clamped = Math.max(0, Math.min(heatmapRamp.length - 1, level));
  return heatmapRamp[clamped];
}
