"use client";

// Navbar.tsx — GitHub-inspired top navigation
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import { Avatar } from "@/components/ui/Avatar";
import { RoleBadge } from "@/components/ui/Badge";

const NAV_TABS = [
  { label: "Overview",      href: "/",              roles: ["ADMIN", "COORDINATOR", "MEMBER"] },
  { label: "Contributions", href: "/contributions", roles: ["ADMIN", "COORDINATOR", "MEMBER"] },
  { label: "Invite",        href: "/invite",        roles: ["ADMIN", "COORDINATOR"] },
  { label: "Events",        href: "/events",        roles: ["ADMIN", "COORDINATOR", "MEMBER"], disabled: true },
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
      className="absolute right-0 top-full mt-2 w-64 bg-[#161b22] border border-[#30363d] rounded-lg shadow-xl shadow-black/50 z-50 animate-scale-in"
    >
      {/* User info */}
      <div className="px-4 py-3 border-b border-[#21262d]">
        <div className="flex items-center gap-3 mb-2">
          <Avatar name={user.name} email={user.email} role={user.role} size="sm" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[#e6edf3] truncate">{user.name ?? "Unnamed"}</p>
            <p className="text-xs text-[#8b949e] truncate">{user.email}</p>
          </div>
        </div>
        <RoleBadge role={user.role} />
        {user.club && (
          <p className="text-xs text-[#8b949e] mt-1.5 truncate">
            {user.club.name}
          </p>
        )}
      </div>

      {/* Details */}
      <div className="py-1">
        <div className="px-4 py-2 text-xs text-[#8b949e]">
          <span className="font-medium text-[#6e7681]">Member since</span>{" "}
          {new Date(user.createdAt).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </div>
        {user.phone && (
          <div className="px-4 py-1 text-xs text-[#8b949e] truncate">{user.phone}</div>
        )}
      </div>

      {/* Actions */}
      <div className="border-t border-[#21262d] py-1">
        <button
          onClick={() => { onLogout(); onClose(); }}
          className="w-full text-left px-4 py-2 text-sm text-[#f85149] hover:bg-[#21262d] transition-colors cursor-pointer"
        >
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

  // Determine active tab
  const activeTab = (() => {
    for (const tab of [...NAV_TABS].reverse()) {
      if (pathname.startsWith(tab.href) && tab.href !== "/") return tab.href;
    }
    return pathname === "/" ? "/" : null;
  })();

  return (
    <header className="fixed top-0 left-0 right-0 z-30 bg-[#161b22] border-b border-[#30363d]">
      {/* Top bar */}
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 h-16 flex items-center gap-4">
        {/* Logo + wordmark */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
          <div className="w-8 h-8 bg-[#0d1117] border border-[#30363d] rounded-md flex items-center justify-center group-hover:border-[#58a6ff] transition-colors">
            <span className="text-[11px] font-extrabold text-[#e6edf3] tracking-tight font-mono">
              CM
            </span>
          </div>
          <span className="text-[15px] font-semibold text-[#e6edf3] hidden sm:block">
            ClubMgmt
          </span>
        </Link>

        {/* Search bar */}
        <div className="flex-1 max-w-xs hidden md:block">
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#6e7681]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z"
              />
            </svg>
            <input
              disabled
              placeholder="Search ClubMgmt..."
              className="w-full pl-9 pr-3 py-1.5 text-sm bg-[#0d1117] border border-[#30363d] rounded-md text-[#6e7681] placeholder:text-[#6e7681] cursor-not-allowed opacity-70 outline-none"
            />
          </div>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Right side */}
        {user ? (
          <div className="flex items-center gap-3">
            {/* Notifications bell */}
            <button
              className="w-8 h-8 flex items-center justify-center text-[#8b949e] hover:text-[#e6edf3] transition-colors cursor-pointer rounded-md hover:bg-[#21262d]"
              title="Notifications (coming soon)"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </button>

            {/* Avatar button */}
            <div className="relative">
              <button
                id="nav-avatar-btn"
                onClick={() => setShowDropdown(!showDropdown)}
                className="cursor-pointer"
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
          <Link
            href="/login"
            className="gh-btn gh-btn-primary gh-btn-sm"
          >
            Sign in
          </Link>
        )}
      </div>

      {/* Tab row — only for authenticated users */}
      {user && (
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6">
          <nav className="flex items-center gap-0 -mb-px">
            {visibleTabs.map((tab) => {
              const isActive = tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
              return (
                <Link
                  key={tab.href}
                  href={tab.disabled ? "#" : tab.href}
                  className={`
                    relative flex items-center gap-1.5 px-4 py-3 text-sm font-medium
                    border-b-2 transition-colors duration-150 whitespace-nowrap
                    ${tab.disabled ? "cursor-not-allowed opacity-40" : "cursor-pointer"}
                    ${
                      isActive && !tab.disabled
                        ? "border-[#f78166] text-[#e6edf3]"
                        : "border-transparent text-[#8b949e] hover:text-[#e6edf3] hover:border-[#30363d]"
                    }
                  `}
                  onClick={tab.disabled ? (e) => e.preventDefault() : undefined}
                  title={tab.disabled ? "Coming soon" : undefined}
                >
                  {tab.label}
                  {tab.disabled && (
                    <span className="text-[9px] text-[#6e7681] border border-[#30363d] rounded px-1 py-0.5 leading-none">
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
