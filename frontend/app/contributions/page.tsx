"use client";

import { useState, useEffect } from "react";
import { AuthGuard } from "@/components/providers/AuthGuard";
import { useAuth } from "@/components/providers/AuthProvider";
import { ContributionList } from "@/components/contributions/ContributionList";
import { ApprovalQueue } from "@/components/contributions/ApprovalQueue";
import { ClubDashboard } from "@/components/contributions/ClubDashboard";
import { GlobalDashboard } from "@/components/contributions/GlobalDashboard";
import { Leaderboard } from "@/components/contributions/Leaderboard";
import { RoleGate } from "@/components/ui/RoleGate";
import { listClubs } from "@/lib/api/club.api";
import type { Club } from "@/types";
import Link from "next/link";

type Tab =
  | "mine"
  | "pending"
  | "club"
  | "analytics"
  | "global"
  | "leaderboard";

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer whitespace-nowrap
        ${active
          ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-600/20"
          : "text-gray-500 bg-white/[0.03] border border-white/[0.06] hover:text-gray-300 hover:bg-white/[0.05]"
        }`}
    >
      {children}
    </button>
  );
}

function ContributionsContent() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("mine");
  const [clubs, setClubs] = useState<Club[]>([]);

  const isAdmin = user?.role === "ADMIN";
  const isCoordinator = user?.role === "COORDINATOR";

  useEffect(() => {
    if (isAdmin) {
      listClubs().then((res) => {
        if (res.data) setClubs(res.data as Club[]);
      });
    }
  }, [isAdmin]);

  if (!user) return null;

  // Set initial tab based on role
  const tabs: { id: Tab; label: string; roles: string[] }[] = [
    { id: "mine", label: "My Contributions", roles: ["ADMIN", "COORDINATOR", "MEMBER"] },
    { id: "pending", label: "Pending Approvals", roles: ["ADMIN", "COORDINATOR"] },
    { id: "club", label: "Club Contributions", roles: ["ADMIN", "COORDINATOR"] },
    { id: "analytics", label: "Club Analytics", roles: ["ADMIN", "COORDINATOR"] },
    { id: "global", label: "Global Analytics", roles: ["ADMIN"] },
    { id: "leaderboard", label: "Leaderboard", roles: ["ADMIN", "COORDINATOR", "MEMBER"] },
  ];

  const visibleTabs = tabs.filter((t) => t.roles.includes(user.role));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-8 sm:pt-12">
      {/* Hero */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-2 h-8 rounded-full bg-gradient-to-b from-violet-500 to-indigo-600" />
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-100 tracking-tight">
                Contributions
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">
                {isAdmin
                  ? "Global contribution management across all clubs"
                  : isCoordinator
                  ? `Contributions for ${user.club?.name ?? "your club"}`
                  : "Track and submit your completed work"}
              </p>
            </div>
          </div>

          {/* Submit button */}
          <Link
            href="/contributions/submit"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold
                       bg-gradient-to-r from-violet-600 to-indigo-600 text-white
                       hover:from-violet-500 hover:to-indigo-500
                       shadow-lg shadow-violet-600/20 transition-all duration-200"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Submit
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {visibleTabs.map((tab) => (
          <TabButton
            key={tab.id}
            active={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </TabButton>
        ))}
      </div>

      {/* Tab content */}
      <div className="animate-fade-in" key={activeTab}>
        {activeTab === "mine" && (
          <ContributionList
            mineOnly
            emptyMessage="You haven't submitted any contributions yet."
          />
        )}

        {activeTab === "pending" && (
          <RoleGate allowedRoles={["ADMIN", "COORDINATOR"]}>
            <ApprovalQueue />
          </RoleGate>
        )}

        {activeTab === "club" && (
          <RoleGate allowedRoles={["ADMIN", "COORDINATOR"]}>
            <ContributionList showUser emptyMessage="No contributions in your club yet." />
          </RoleGate>
        )}

        {activeTab === "analytics" && (
          <RoleGate allowedRoles={["ADMIN", "COORDINATOR"]}>
            <ClubDashboard />
          </RoleGate>
        )}

        {activeTab === "global" && (
          <RoleGate allowedRoles={["ADMIN"]}>
            <GlobalDashboard clubs={clubs} />
          </RoleGate>
        )}

        {activeTab === "leaderboard" && (
          <Leaderboard />
        )}
      </div>
    </div>
  );
}

export default function ContributionsPage() {
  return (
    <AuthGuard>
      <ContributionsContent />
    </AuthGuard>
  );
}
