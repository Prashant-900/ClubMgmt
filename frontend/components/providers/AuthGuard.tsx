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
          <div className="w-8 h-8 mx-auto rounded-full border-2 border-[#dadce0] border-t-[#1a73e8] animate-spin" />
          <p className="text-sm text-[#80868b]">Loading…</p>
        </div>
      </div>
    );
  }

  // Not authenticated — redirect in progress
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 mx-auto rounded-full border-2 border-[#dadce0] border-t-[#1a73e8] animate-spin" />
          <p className="text-sm text-[#80868b]">Redirecting to sign in…</p>
        </div>
      </div>
    );
  }

  // Authenticated but no club and not admin → waiting screen
  if (user.role !== "ADMIN" && !user.clubId && !user.club) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center space-y-6">
          <div className="w-16 h-16 mx-auto rounded-full bg-[rgba(251,188,5,0.15)] border border-[rgba(251,188,5,0.3)] flex items-center justify-center">
            <svg className="w-8 h-8 text-[#b06000]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>

          <div className="space-y-1">
            <h1 className="text-xl font-bold text-[#202124]">
              Hey{user.name ? `, ${user.name.split(" ")[0]}` : ""}!
            </h1>
            <p className="text-sm text-[#5f6368]">
              Your account is set up, but you haven&apos;t been assigned to a club yet.
            </p>
          </div>

          <div className="bg-[#f8f9fa] border border-[#dadce0] rounded-md p-4 text-left space-y-2">
            <p className="text-sm text-[#5f6368] leading-relaxed">
              An admin will assign you to a club or promote you to a club lead.
              Once that happens, you&apos;ll see your club&apos;s dashboard here.
            </p>
          </div>

          <div className="flex items-center justify-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#b06000] animate-pulse" />
            <span className="text-xs text-[#b06000] font-medium">
              Waiting for admin assignment
            </span>
          </div>

          <p className="text-xs text-[#80868b] border-t border-[#f1f3f4] pt-4">
            Signed in as <span className="text-[#5f6368]">{user.email}</span>
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
