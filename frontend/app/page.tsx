"use client";

import { AuthGuard } from "@/components/providers/AuthGuard";
import { useAuth } from "@/components/providers/AuthProvider";
import { MemberGrid } from "@/components/members/MemberGrid";
import { ClubGrid } from "@/components/clubs/ClubGrid";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";

function DashboardContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();

  if (!user) return null;

  const isAdmin = user.role === "ADMIN";
  const clubName = user.club?.name;
  const urlClubId = searchParams.get("clubId");

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-8 sm:pt-12">
      {/* Hero */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-2 h-8 rounded-full bg-gradient-to-b from-violet-500 to-indigo-600" />
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-100 tracking-tight">
            {isAdmin 
              ? urlClubId 
                ? "Club Members" 
                : "Clubs"
              : clubName ?? "My Club"}
          </h1>
        </div>
        <p className="text-sm text-gray-500 ml-5">
          {isAdmin
            ? urlClubId
              ? "Manage members for this club"
              : "Select a club to view its members"
            : user.role === "COORDINATOR"
            ? `Manage members and invite links for ${clubName}`
            : `Members of ${clubName}`}
        </p>

        {/* Back button for Admin viewing a specific club */}
        {isAdmin && urlClubId && (
          <div className="mt-4 ml-5">
            <button
              onClick={() => router.push("/")}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium
                         bg-white/5 border border-white/10
                         text-gray-300 hover:bg-white/10 hover:text-white
                         transition-all duration-200 cursor-pointer"
            >
              ← Back to Clubs
            </button>
          </div>
        )}

        {/* Coordinator quick-action: invite link */}
        {user.role === "COORDINATOR" && (
          <div className="mt-4 ml-5">
            <Link
              href="/invite"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium
                         bg-gradient-to-r from-cyan-600/20 to-blue-600/20 border border-cyan-500/20
                         text-cyan-300 hover:from-cyan-600/30 hover:to-blue-600/30
                         transition-all duration-200"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              Create Invite Link
            </Link>
          </div>
        )}
      </div>

      {isAdmin && !urlClubId ? (
        <ClubGrid />
      ) : (
        <MemberGrid clubId={urlClubId ?? undefined} />
      )}
    </div>
  );
}

export default function HomePage() {
  return (
    <AuthGuard>
      <Suspense fallback={<div className="p-8 text-center text-gray-500">Loading...</div>}>
        <DashboardContent />
      </Suspense>
    </AuthGuard>
  );
}
