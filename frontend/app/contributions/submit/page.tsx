"use client";

import { useEffect, useState } from "react";
import { AuthGuard } from "@/components/providers/AuthGuard";
import { useAuth } from "@/components/providers/AuthProvider";
import { ContributionForm } from "@/components/contributions/ContributionForm";
import { listClubs } from "@/lib/api/club.api";
import type { Club } from "@/types";
import Link from "next/link";

function SubmitContent() {
  const { user } = useAuth();
  const [clubs, setClubs] = useState<Club[]>([]);

  useEffect(() => {
    if (user?.role === "ADMIN") {
      listClubs().then((res) => {
        if (res.data) setClubs(res.data as Club[]);
      });
    }
  }, [user?.role]);

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-8 sm:pt-12">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/contributions"
          className="group inline-flex items-center gap-2 text-xs text-[#1a73e8] hover:text-[#174ea6] transition-colors mb-4"
        >
          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[#e6f4ea] text-[#188038] group-hover:bg-[#34a853] group-hover:text-white transition-colors">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </span>
          Back to Contributions
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-9 rounded-full bg-[#4285f4]" />
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#202124] tracking-tight">
              Submit Contribution
            </h1>
            <p className="text-sm text-[#5f6368] mt-0.5">
              Record a completed piece of work
            </p>
          </div>
        </div>
      </div>

      {/* Form card */}
      <div className="bg-white border border-[#dadce0] rounded-2xl p-6 shadow-sm">
        <ContributionForm clubs={clubs} />
      </div>
    </div>
  );
}

export default function SubmitContributionPage() {
  return (
    <AuthGuard>
      <SubmitContent />
    </AuthGuard>
  );
}
