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
          className="inline-flex items-center gap-2 text-xs text-gray-500 hover:text-gray-300 transition-colors mb-4"
        >
          ← Back to Contributions
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-2 h-8 rounded-full bg-gradient-to-b from-violet-500 to-indigo-600" />
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-100 tracking-tight">
              Submit Contribution
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Record a completed piece of work
            </p>
          </div>
        </div>
      </div>

      {/* Form card */}
      <div className="bg-glass backdrop-blur-xl border border-glass-border rounded-2xl p-6">
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
