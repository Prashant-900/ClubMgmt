import { apiRequest } from "./client";
import type { AppNotification, Pagination } from "@/types";

/**
 * Notifications API (redesign initiative).
 *
 * The backend Notification model + routes are delivered as a separate piece of
 * work. The web bell is built to poll these endpoints and DEGRADE GRACEFULLY:
 * every call swallows errors and returns an empty/zero result so the UI never
 * breaks when the endpoints aren't live yet.
 */

export interface NotificationListResult {
  notifications: AppNotification[];
  pagination?: Pagination;
}

/** List notifications (most recent first). Returns [] on any failure. */
export async function listNotifications(
  token?: string
): Promise<NotificationListResult> {
  try {
    const res = await apiRequest<NotificationListResult | AppNotification[]>(
      "/notifications",
      { token }
    );
    const data = res.data;
    if (Array.isArray(data)) return { notifications: data };
    return { notifications: data?.notifications ?? [] };
  } catch {
    return { notifications: [] };
  }
}

/** Unread count for the bell badge. Returns 0 on any failure. */
export async function getUnreadCount(token?: string): Promise<number> {
  try {
    const res = await apiRequest<{ count: number }>(
      "/notifications/unread-count",
      { token }
    );
    return res.data?.count ?? 0;
  } catch {
    return 0;
  }
}

/** Mark a single notification read. Best-effort. */
export async function markNotificationRead(
  id: string,
  token?: string
): Promise<void> {
  try {
    await apiRequest(`/notifications/${id}/read`, { method: "PATCH", token });
  } catch {
    /* best-effort */
  }
}

/** Mark all notifications read. Best-effort. */
export async function markAllNotificationsRead(token?: string): Promise<void> {
  try {
    await apiRequest("/notifications/read-all", { method: "PATCH", token });
  } catch {
    /* best-effort */
  }
}
