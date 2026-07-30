import type { Role } from '../types';

/**
 * Hours without a unit suffix, matching the web's `h % 1 === 0 ? String(h) : h.toFixed(1)`.
 * Used in stat cards, the heatmap summary, and member-profile rows.
 */
export function formatHours(hours: number): string {
  return hours % 1 === 0 ? String(hours) : hours.toFixed(1);
}

/**
 * Hours with a trailing `h`, matching the web's `${h}h` / `${h.toFixed(1)}h`.
 * Used on the dashboard and the contribution-detail Hours field.
 */
export function formatHoursSuffix(hours: number): string {
  return hours % 1 === 0 ? `${hours}h` : `${hours.toFixed(1)}h`;
}

/** Long date — "5 August 2026" (en-IN). Matches contribution / member-profile displays. */
export function formatDateLong(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/** Short month + year — "Aug 2026" (en-IN). Matches member cards / navbar. */
export function formatMonthYear(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    month: 'short',
    year: 'numeric',
  });
}

/** Full date with weekday — "Wednesday, 5 August 2026" (en-IN). Heatmap tooltips. */
export function formatDateFull(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/** Plain locale date for footer timestamps ("Submitted …" / "Updated …"). */
export function formatDatePlain(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN');
}

/** Human role labels, mirrored from the web member-profile page. */
export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: 'Administrator',
  COORDINATOR: 'Club coordinator',
  MEMBER: 'Member',
};

export function roleLabel(role: Role): string {
  return ROLE_LABELS[role];
}

/**
 * Extract a human message from the `{ success:false, message, status }` shape
 * thrown by the API client. Mirrors the web's getApiErrorMessage.
 */
export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (
    error &&
    typeof error === 'object' &&
    'message' in error &&
    typeof (error as { message?: unknown }).message === 'string' &&
    (error as { message: string }).message.trim().length > 0
  ) {
    return (error as { message: string }).message;
  }
  return fallback;
}

/** Extract the HTTP status from an API rejection, or null. */
export function getApiErrorStatus(error: unknown): number | null {
  if (
    error &&
    typeof error === 'object' &&
    'status' in error &&
    typeof (error as { status?: unknown }).status === 'number'
  ) {
    return (error as { status: number }).status;
  }
  return null;
}
