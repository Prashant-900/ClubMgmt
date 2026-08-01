"use client";

// NotificationBell.tsx — navbar bell with unread badge + dropdown.
// Polls via useNotifications (30s). Mark-as-read (single + all). Degrades to an
// empty state when the backend endpoints aren't live yet.

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useNotifications } from "@/lib/hooks/useNotifications";
import {
  BellIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  InviteIcon,
} from "@/components/icons";
import type { AppNotification, NotificationType } from "@/types";

function iconFor(type: NotificationType) {
  switch (type) {
    case "CONTRIBUTION_APPROVED":
      return <CheckCircleIcon className="w-4 h-4 text-brand-green-fg" />;
    case "CONTRIBUTION_REJECTED":
      return <XCircleIcon className="w-4 h-4 text-brand-red-fg" />;
    case "CONTRIBUTION_PENDING":
      return <ClockIcon className="w-4 h-4 text-brand-yellow-fg" />;
    case "INVITE_USED":
      return <InviteIcon className="w-4 h-4 text-brand-blue-fg" />;
    default:
      return <BellIcon className="w-4 h-4 text-fg-muted" />;
  }
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function NotificationRow({
  n,
  onRead,
}: {
  n: AppNotification;
  onRead: (id: string) => void;
}) {
  const body = (
    <div className="flex items-start gap-3 px-4 py-3">
      <span className="mt-0.5 shrink-0">{iconFor(n.type)}</span>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-fg leading-snug">{n.title}</p>
        {n.body && (
          <p className="text-xs text-fg-muted mt-0.5 line-clamp-2">{n.body}</p>
        )}
        <p className="text-[11px] text-fg-subtle mt-1">{timeAgo(n.createdAt)}</p>
      </div>
      {!n.read && (
        <span className="mt-1.5 shrink-0 w-2 h-2 rounded-full bg-brand-blue" />
      )}
    </div>
  );

  const cls = `block transition-colors hover:bg-surface-2 ${
    n.read ? "" : "bg-brand-blue/[0.04]"
  }`;

  return n.linkTo ? (
    <Link href={n.linkTo} onClick={() => onRead(n.id)} className={cls}>
      {body}
    </Link>
  ) : (
    <button
      type="button"
      onClick={() => onRead(n.id)}
      className={`w-full text-left ${cls}`}
    >
      {body}
    </button>
  );
}

export function NotificationBell() {
  const { notifications, unread, markRead, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      const handler = (e: MouseEvent) => {
        if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
      };
      document.addEventListener("mousedown", handler);
      return () => document.removeEventListener("mousedown", handler);
    }, 10);
    return () => clearTimeout(t);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative w-9 h-9 flex items-center justify-center text-fg-muted hover:text-fg hover:bg-surface-2 rounded-full transition-colors"
        aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
      >
        <BellIcon className="w-5 h-5" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center text-[10px] font-semibold text-white bg-brand-red rounded-full ring-2 ring-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 max-w-[calc(100vw-2rem)] bg-white border border-border rounded-2xl shadow-xl shadow-black/10 z-50 animate-scale-in overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border-muted">
            <p className="text-sm font-semibold text-fg font-display">
              Notifications
            </p>
            {unread > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs font-medium text-brand-blue-fg hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-[60vh] overflow-y-auto divide-y divide-border-muted">
            {notifications.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <BellIcon className="w-7 h-7 mx-auto text-fg-subtle" />
                <p className="text-sm text-fg-muted mt-3">You're all caught up</p>
                <p className="text-xs text-fg-subtle mt-1">
                  New activity will show up here.
                </p>
              </div>
            ) : (
              notifications.map((n) => (
                <NotificationRow key={n.id} n={n} onRead={markRead} />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
