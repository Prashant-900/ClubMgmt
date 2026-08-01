"use client";

// Navbar.tsx — Google-style light top navigation
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import { Avatar } from "@/components/ui/Avatar";
import { RoleBadge } from "@/components/ui/Badge";
import { NotificationBell } from "@/components/layout/NotificationBell";
import {
  OverviewIcon,
  ContributionsIcon,
  InviteIcon,
  EventsIcon,
  SignOutIcon,
  LogoMark,
} from "@/components/icons";

const NAV_TABS = [
  { label: "Overview",      href: "/",              icon: OverviewIcon,      roles: ["ADMIN", "COORDINATOR", "MEMBER"] },
  { label: "Contributions", href: "/contributions", icon: ContributionsIcon, roles: ["ADMIN", "COORDINATOR", "MEMBER"] },
  { label: "Invite",        href: "/invite",        icon: InviteIcon,        roles: ["ADMIN", "COORDINATOR"] },
  { label: "Events",        href: "/events",        icon: EventsIcon,        roles: ["ADMIN", "COORDINATOR", "MEMBER"], disabled: true },
];

function UserDropdown({
  isOpen,
  onClose,
  onLogout,
}: {
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
}) {
  const { user } = useAuth();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      const handler = (e: MouseEvent) => {
        if (ref.current && !ref.current.contains(e.target as Node)) onClose();
      };
      document.addEventListener("mousedown", handler);
      return () => document.removeEventListener("mousedown", handler);
    }, 10);
    return () => clearTimeout(timer);
  }, [isOpen, onClose]);

  if (!isOpen || !user) return null;

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full mt-2 w-64 bg-white border border-border rounded-2xl shadow-xl shadow-black/10 z-50 animate-scale-in overflow-hidden"
    >
      {/* User info */}
      <div className="px-4 py-3 border-b border-border-muted">
        <Link
          href={`/members/${user.id}`}
          onClick={onClose}
          className="flex items-center gap-3 mb-2 -mx-1 px-1 py-1 rounded-lg hover:bg-surface-2 transition-colors"
        >
          <Avatar name={user.name} email={user.email} role={user.role} size="sm" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-brand-blue-fg truncate hover:underline">{user.name ?? "Unnamed"}</p>
            <p className="text-xs text-fg-muted truncate">{user.email}</p>
          </div>
        </Link>
        <RoleBadge role={user.role} />
        {user.club && (
          <p className="text-xs text-fg-muted mt-1.5 truncate">{user.club.name}</p>
        )}
      </div>

      {/* Details */}
      <div className="py-1">
        <div className="px-4 py-2 text-xs text-fg-muted">
          <span className="font-medium text-fg-subtle">Member since</span>{" "}
          {new Date(user.createdAt).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </div>
        {user.phone && (
          <div className="px-4 py-1 text-xs text-fg-muted truncate">{user.phone}</div>
        )}
      </div>

      {/* Actions */}
      <div className="border-t border-border-muted py-1">
        <button
          onClick={() => { onLogout(); onClose(); }}
          className="w-full flex items-center gap-2 text-left px-4 py-2.5 text-sm text-brand-red-fg hover:bg-surface-2 transition-colors"
        >
          <SignOutIcon className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </div>
  );
}

export function Navbar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [showDropdown, setShowDropdown] = useState(false);

  const visibleTabs = NAV_TABS.filter(
    (tab) => !user || tab.roles.includes(user.role)
  );

  return (
    <header className="fixed top-0 left-0 right-0 z-30 bg-white border-b border-border">
      {/* Top bar */}
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 h-16 flex items-center gap-4">
        {/* Logo + wordmark */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
          <div className="w-9 h-9 bg-brand-blue rounded-xl flex items-center justify-center group-hover:bg-brand-blue-fg transition-colors">
            <LogoMark className="w-5 h-5 text-white" />
          </div>
          <span className="text-[17px] font-semibold text-fg hidden sm:block font-display tracking-tight">
            ClubMgmt
          </span>
        </Link>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Right side */}
        {user ? (
          <div className="flex items-center gap-2 sm:gap-3">
            <NotificationBell />

            {/* Avatar button */}
            <div className="relative">
              <button
                id="nav-avatar-btn"
                onClick={() => setShowDropdown(!showDropdown)}
                aria-label="Open user menu"
              >
                <Avatar
                  name={user.name}
                  email={user.email}
                  role={user.role}
                  size="sm"
                  className="hover:opacity-80 transition-opacity"
                />
              </button>
              <UserDropdown
                isOpen={showDropdown}
                onClose={() => setShowDropdown(false)}
                onLogout={logout}
              />
            </div>
          </div>
        ) : (
          <Link href="/login" className="gh-btn gh-btn-primary gh-btn-sm">
            Sign in
          </Link>
        )}
      </div>

      {/* Tab row — only for authenticated users */}
      {user && (
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6">
          <nav className="flex items-center gap-1 -mb-px overflow-x-auto">
            {visibleTabs.map((tab, i) => {
              const Icon = tab.icon;
              const isActive = tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
              const underline = ["#34a853", "#ea4335", "#fbbc05"][i % 3];
              return (
                <Link
                  key={tab.href}
                  href={tab.disabled ? "#" : tab.href}
                  className={`
                    relative flex items-center gap-2 px-4 py-3 text-sm font-medium
                    border-b-2 transition-colors duration-150 whitespace-nowrap
                    ${tab.disabled ? "cursor-not-allowed opacity-40" : ""}
                    ${
                      isActive && !tab.disabled
                        ? "text-[#1a73e8]"
                        : "border-transparent text-fg-muted hover:text-fg hover:border-border"
                    }
                  `}
                  style={
                    isActive && !tab.disabled
                      ? { borderBottomColor: underline }
                      : undefined
                  }
                  onClick={tab.disabled ? (e) => e.preventDefault() : undefined}
                  title={tab.disabled ? "Coming soon" : undefined}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                  {tab.disabled && (
                    <span className="text-[9px] text-fg-subtle border border-border rounded-full px-1.5 py-0.5 leading-none">
                      soon
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </header>
  );
}
