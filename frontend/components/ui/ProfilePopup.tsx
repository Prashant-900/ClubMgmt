"use client";

import { useEffect, useRef } from "react";
import type { User } from "@/types";

interface ProfilePopupProps {
  user: User;
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
}

function getRoleBadgeClasses(role: string): string {
  switch (role) {
    case "ADMIN":
      return "text-violet-400 bg-violet-500/15 border border-violet-500/30";
    case "COORDINATOR":
      return "text-cyan-400 bg-cyan-500/15 border border-cyan-500/30";
    case "MEMBER":
      return "text-emerald-400 bg-emerald-500/15 border border-emerald-500/30";
    default:
      return "text-gray-400 bg-gray-500/10 border border-gray-500/30";
  }
}

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

export function ProfilePopup({ user, isOpen, onClose, onLogout }: ProfilePopupProps) {
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    function handleClick(e: MouseEvent) {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        onClose();
      }
    }

    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }

    // Delay adding the listener so the opening click doesn't immediately close it
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleClick);
      document.addEventListener("keydown", handleEscape);
    }, 10);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const initials = user.name
    ? user.name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : user.email[0].toUpperCase();

  return (
    <>
      {/* Backdrop blur overlay */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 animate-fade-in"
        aria-hidden="true"
      />

      {/* Popup — positioned above the footer, bottom-left */}
      <div
        ref={popupRef}
        className="fixed bottom-20 left-4 sm:left-6 z-50 w-[min(320px,calc(100vw-32px))]
                   bg-[rgba(15,13,26,0.95)] backdrop-blur-2xl border border-white/10 
                   rounded-2xl shadow-2xl shadow-black/50 animate-scale-in"
      >
        {/* Header */}
        <div className="p-5 pb-4 border-b border-white/5">
          <div className="flex items-center gap-3.5">
            <div
              className={`w-14 h-14 rounded-full bg-gradient-to-br ${getAvatarGradient(user.role)} 
                          flex items-center justify-center text-white text-lg font-bold 
                          ring-2 ring-white/10 shadow-lg`}
            >
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-semibold text-gray-100 truncate">
                {user.name || "Unnamed"}
              </h3>
              <p className="text-xs text-gray-500 truncate mt-0.5">
                {user.email}
              </p>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 mt-1.5 rounded-full text-[10px] font-semibold tracking-wider uppercase ${getRoleBadgeClasses(user.role)}`}
              >
                {user.role}
              </span>
            </div>
          </div>
        </div>

        {/* Details */}
        <div className="p-5 space-y-3.5">
          {/* Phone */}
          <div className="flex items-center gap-3 text-sm">
            <svg className="w-4 h-4 text-gray-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            <span className="text-gray-400">{user.phone || "Not provided"}</span>
          </div>

          {/* Verified */}
          <div className="flex items-center gap-3 text-sm">
            <svg className="w-4 h-4 text-gray-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            {user.isVerified ? (
              <span className="text-emerald-400">Verified</span>
            ) : (
              <span className="text-amber-400">Pending verification</span>
            )}
          </div>

          {/* Member since */}
          <div className="flex items-center gap-3 text-sm">
            <svg className="w-4 h-4 text-gray-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-gray-400">
              Since{" "}
              {new Date(user.createdAt).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </span>
          </div>

          {/* ID */}
          <div className="flex items-center gap-3 text-sm">
            <svg className="w-4 h-4 text-gray-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
            </svg>
            <span className="text-gray-600 font-mono text-xs truncate">{user.id}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 pb-4">
          <button
            onClick={onClose}
            className="w-full py-2 text-xs font-medium text-gray-400 bg-white/5 
                       border border-white/5 rounded-lg
                       hover:bg-white/10 hover:text-gray-300 transition-all cursor-pointer"
          >
            Close
          </button>
          <button
            onClick={onLogout}
            className="w-full mt-2 py-2 text-xs font-medium text-rose-300 bg-rose-500/10 
                       border border-rose-500/20 rounded-lg
                       hover:bg-rose-500/15 hover:text-rose-200 transition-all cursor-pointer"
          >
            Sign out
          </button>
        </div>
      </div>
    </>
  );
}
