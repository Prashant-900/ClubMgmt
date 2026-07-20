"use client";

import { AuthGuard } from "@/components/providers/AuthGuard";
import { useAuth } from "@/components/providers/AuthProvider";
import { MemberGrid } from "@/components/members/MemberGrid";
import Link from "next/link";

function DashboardContent() {
  const { user } = useAuth();

  if (!user) return null;

  const isAdmin = user.role === "ADMIN";
  const clubName = user.club?.name;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-8 sm:pt-12">
      {/* Hero */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-2 h-8 rounded-full bg-gradient-to-b from-violet-500 to-indigo-600" />
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-100 tracking-tight">
            {isAdmin ? "Members" : clubName ?? "My Club"}
          </h1>
        </div>
        <p className="text-sm text-gray-500 ml-5">
          {isAdmin
            ? "Manage all club members, coordinators, and admins"
            : user.role === "COORDINATOR"
            ? `Manage members and invite links for ${clubName}`
            : `Members of ${clubName}`}
        </p>

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

      {/* Member Grid */}
      <MemberGrid />
    </div>
  );
}

export default function HomePage() {
  return (
    <AuthGuard>
      <DashboardContent />
    </AuthGuard>
  );
}
