"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";

/**
 * AuthGuard — gates content based on auth state.
 *
 * - loading  → full-screen spinner
 * - no user  → redirect to /login
 * - user with no club AND not ADMIN → "Waiting for admin" screen
 * - otherwise → render children
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 mx-auto rounded-full border-2 border-[#30363d] border-t-[#58a6ff] animate-spin" />
          <p className="text-sm text-[#6e7681]">Loading…</p>
        </div>
      </div>
    );
  }

  // Not authenticated — redirect in progress
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 mx-auto rounded-full border-2 border-[#30363d] border-t-[#58a6ff] animate-spin" />
          <p className="text-sm text-[#6e7681]">Redirecting to sign in…</p>
        </div>
      </div>
    );
  }

  // Authenticated but no club and not admin → waiting screen
  if (user.role !== "ADMIN" && !user.clubId && !user.club) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center space-y-6">
          <div className="w-16 h-16 mx-auto rounded-full bg-[rgba(210,153,34,0.15)] border border-[rgba(210,153,34,0.3)] flex items-center justify-center">
            <svg className="w-8 h-8 text-[#d29922]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>

          <div className="space-y-1">
            <h1 className="text-xl font-bold text-[#e6edf3]">
              Hey{user.name ? `, ${user.name.split(" ")[0]}` : ""}!
            </h1>
            <p className="text-sm text-[#8b949e]">
              Your account is set up, but you haven&apos;t been assigned to a club yet.
            </p>
          </div>

          <div className="bg-[#161b22] border border-[#30363d] rounded-md p-4 text-left space-y-2">
            <p className="text-sm text-[#8b949e] leading-relaxed">
              An admin will assign you to a club or promote you to a club lead.
              Once that happens, you&apos;ll see your club&apos;s dashboard here.
            </p>
          </div>

          <div className="flex items-center justify-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#d29922] animate-pulse" />
            <span className="text-xs text-[#d29922] font-medium">
              Waiting for admin assignment
            </span>
          </div>

          <p className="text-xs text-[#6e7681] border-t border-[#21262d] pt-4">
            Signed in as <span className="text-[#8b949e]">{user.email}</span>
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
