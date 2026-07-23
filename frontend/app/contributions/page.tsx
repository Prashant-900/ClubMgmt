"use client";

import { useState, useEffect } from "react";
import { AuthGuard } from "@/components/providers/AuthGuard";
import { useAuth } from "@/components/providers/AuthProvider";
import { ContributionList } from "@/components/contributions/ContributionList";
import { ApprovalQueue } from "@/components/contributions/ApprovalQueue";
import { ClubDashboard } from "@/components/contributions/ClubDashboard";
import { GlobalDashboard } from "@/components/contributions/GlobalDashboard";
import { Leaderboard } from "@/components/contributions/Leaderboard";
import { AdminMembersOverview } from "@/components/members/AdminMembersOverview";
import { MemberGrid } from "@/components/members/MemberGrid";
import { PageTabs } from "@/components/ui/PageTabs";
import { RoleGate } from "@/components/ui/RoleGate";
import { listClubs } from "@/lib/api/club.api";
import type { Club } from "@/types";
import Link from "next/link";

type Tab = "mine" | "pending" | "members" | "club" | "analytics" | "global" | "leaderboard";

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

  const allTabs: { id: Tab; label: string; roles: string[] }[] = [
    { id: "mine",        label: "My contributions",  roles: ["ADMIN", "COORDINATOR", "MEMBER"] },
    { id: "pending",     label: "Pending approvals", roles: ["ADMIN", "COORDINATOR"] },
    { id: "members",     label: "Members",           roles: ["ADMIN", "COORDINATOR", "MEMBER"] },
    { id: "club",        label: "Club contributions",roles: ["ADMIN", "COORDINATOR"] },
    { id: "analytics",   label: "Analytics",         roles: ["ADMIN", "COORDINATOR"] },
    { id: "global",      label: "Global analytics",  roles: ["ADMIN"] },
    { id: "leaderboard", label: "Leaderboard",       roles: ["ADMIN", "COORDINATOR", "MEMBER"] },
  ];

  const visibleTabs = allTabs.filter((t) => t.roles.includes(user.role));

  return (
    <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-8">
      {/* Page header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-[#e6edf3]">Contributions</h1>
          <p className="text-sm text-[#8b949e] mt-0.5">
            {isAdmin
              ? "Global contribution management across all clubs"
              : isCoordinator
              ? `Contributions for ${user.club?.name ?? "your club"}`
              : "Track and submit your completed work"}
          </p>
        </div>

        <Link
          href="/contributions/submit"
          className="gh-btn gh-btn-primary"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          New contribution
        </Link>
      </div>

      {/* GitHub-style tab bar */}
      <PageTabs
        tabs={visibleTabs.map((t) => ({ id: t.id, label: t.label }))}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        className="mb-6"
      />

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

        {/* Members tab: admin sees all (assigned + unassigned), coordinator/member sees club members */}
        {activeTab === "members" && (
          <RoleGate allowedRoles={["ADMIN", "COORDINATOR", "MEMBER"]}>
            {isAdmin ? <AdminMembersOverview /> : <MemberGrid />}
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

        {activeTab === "leaderboard" && <Leaderboard />}
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
