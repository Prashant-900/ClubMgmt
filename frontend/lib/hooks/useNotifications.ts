"use client";

// useNotifications.ts — polls the notification API every 30s for the navbar bell.
// Fully degrades to an empty/zero state when the backend endpoints aren't live.

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import {
  listNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
} from "@/lib/api/notification.api";
import type { AppNotification } from "@/types";

const POLL_MS = 30_000;

export function useNotifications() {
  const { user, token } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async () => {
    if (!user) return;
    const [list, count] = await Promise.all([
      listNotifications(token ?? undefined),
      getUnreadCount(token ?? undefined),
    ]);
    setNotifications(list.notifications);
    // Prefer the explicit unread-count endpoint; fall back to counting locally.
    setUnread(
      count || list.notifications.filter((n) => !n.read).length
    );
  }, [user, token]);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnread(0);
      return;
    }
    refresh();
    timer.current = setInterval(refresh, POLL_MS);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [user, refresh]);

  const markRead = useCallback(
    async (id: string) => {
      // Optimistic update.
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      setUnread((u) => Math.max(0, u - 1));
      await markNotificationRead(id, token ?? undefined);
    },
    [token]
  );

  const markAllRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnread(0);
    await markAllNotificationsRead(token ?? undefined);
  }, [token]);

  return { notifications, unread, refresh, markRead, markAllRead };
}
