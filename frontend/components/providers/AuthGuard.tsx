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
      <div className="min-h-[calc(100vh-5rem)] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 mx-auto rounded-full border-2 border-violet-500/30 border-t-violet-500 animate-spin" />
          <p className="text-sm text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  // Not authenticated — redirect in progress
  if (!user) {
    return (
      <div className="min-h-[calc(100vh-5rem)] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 mx-auto rounded-full border-2 border-violet-500/30 border-t-violet-500 animate-spin" />
          <p className="text-sm text-gray-500">Redirecting to sign in...</p>
        </div>
      </div>
    );
  }

  // Authenticated but no club assignment and not an admin → waiting screen
  if (user.role !== "ADMIN" && !user.clubId && !user.club) {
    return (
      <div className="min-h-[calc(100vh-5rem)] px-4 sm:px-6 flex items-center justify-center">
        <div className="w-full max-w-md text-center space-y-6">
          {/* Pulsing icon */}
          <div className="relative w-20 h-20 mx-auto">
            <div className="absolute inset-0 rounded-full bg-violet-500/10 animate-ping" style={{ animationDuration: "2s" }} />
            <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-violet-600/20 to-indigo-700/20 border border-violet-500/20 flex items-center justify-center">
              <svg className="w-9 h-9 text-violet-400/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>

          {/* Greeting */}
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.28em] text-violet-400/60">
              Welcome
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-100">
              Hey{user.name ? `, ${user.name.split(" ")[0]}` : ""}! 👋
            </h1>
          </div>

          {/* Message */}
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6 space-y-3">
            <p className="text-sm text-gray-300 leading-relaxed">
              Your account is set up, but you haven&apos;t been assigned to a club yet.
            </p>
            <p className="text-sm text-gray-500 leading-relaxed">
              An admin will assign you to a club or promote you to a club lead.
              Once that happens, you&apos;ll see your club&apos;s dashboard here.
            </p>
          </div>

          {/* Status indicator */}
          <div className="flex items-center justify-center gap-2">
            <div className="w-2 h-2 rounded-full bg-amber-400 shadow-sm shadow-amber-400/50 animate-pulse" />
            <span className="text-xs text-amber-400/80 font-medium">
              Waiting for admin assignment
            </span>
          </div>

          {/* User info */}
          <div className="pt-2 border-t border-white/5">
            <p className="text-[11px] text-gray-600">
              Signed in as <span className="text-gray-400">{user.email}</span>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
