"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import { ProfilePopup } from "@/components/ui/ProfilePopup";
import { RoleGate } from "@/components/ui/RoleGate";

function getAvatarGradient(role: string): string {
  switch (role) {
    case "ADMIN":
      return "from-violet-500 to-purple-700";
    case "COORDINATOR":
      return "from-cyan-500 to-blue-700";
    case "MEMBER":
      return "from-emerald-500 to-teal-700";
    default:
      return "from-gray-500 to-gray-700";
  }
}

export function Footer() {
  const { user } = useAuth();
  const pathname = usePathname();
  const [showProfile, setShowProfile] = useState(false);

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  return (
    <>
      {/* Profile popup */}
      {user && (
        <ProfilePopup
          user={user}
          isOpen={showProfile}
          onClose={() => setShowProfile(false)}
        />
      )}

      {/* Footer bar */}
      <footer
        className="fixed bottom-0 left-0 right-0 h-16 z-30
                   bg-[rgba(10,10,15,0.85)] backdrop-blur-2xl
                   border-t border-white/[0.06]"
      >
        <div className="max-w-7xl mx-auto h-full px-4 sm:px-6 flex items-center justify-between">
          {/* Left — Profile avatar button */}
          <button
            id="profile-button"
            onClick={() => setShowProfile(!showProfile)}
            className="flex items-center gap-2.5 group cursor-pointer"
          >
            <div
              className={`w-9 h-9 rounded-full bg-gradient-to-br ${getAvatarGradient(user?.role || "MEMBER")} 
                          flex items-center justify-center text-white text-xs font-bold
                          ring-2 ring-white/10 group-hover:ring-white/20 
                          transition-all duration-200 group-hover:scale-105`}
            >
              {initials}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-medium text-gray-300 group-hover:text-gray-100 transition-colors leading-tight">
                {user?.name || "User"}
              </p>
              <p className="text-[10px] text-gray-600">{user?.role}</p>
            </div>
            {/* Chevron */}
            <svg
              className={`w-3.5 h-3.5 text-gray-600 transition-transform duration-200 hidden sm:block
                         ${showProfile ? "rotate-180" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
            </svg>
          </button>

          {/* Center — Navigation */}
          <nav className="flex items-center gap-1.5">
            <Link
              href="/"
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all duration-200 
                ${
                  pathname === "/"
                    ? "bg-violet-600 text-white shadow-lg shadow-violet-600/20"
                    : "text-gray-400 hover:text-gray-200 hover:bg-white/5"
                }`}
            >
              Home
            </Link>
            <RoleGate allowedRoles={["ADMIN", "COORDINATOR"]}>
              <Link
                href="/invite"
                className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all duration-200
                  ${
                    pathname === "/invite"
                      ? "bg-violet-600 text-white shadow-lg shadow-violet-600/20"
                      : "text-gray-400 hover:text-gray-200 hover:bg-white/5"
                  }`}
              >
                Invite
              </Link>
            </RoleGate>
          </nav>

          {/* Right — Branding */}
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-700 
                            flex items-center justify-center">
              <span className="text-white text-[10px] font-extrabold">CM</span>
            </div>
            <span className="hidden sm:block text-xs font-medium text-gray-500">
              ClubMgmt
            </span>
          </div>
        </div>
      </footer>
    </>
  );
}
