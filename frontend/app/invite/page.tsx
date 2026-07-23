"use client";

import { InviteLinkForm } from "@/components/members/InviteForm";
import { AuthGuard } from "@/components/providers/AuthGuard";

export default function InvitePage() {
  return (
    <AuthGuard>
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-8">
        {/* Page header */}
        <div className="mb-6 pb-6 border-b border-[#21262d]">
          <h1 className="text-xl font-bold text-[#e6edf3]">Invite Links</h1>
          <p className="text-sm text-[#8b949e] mt-0.5">
            Create shareable invite links for new members and coordinators
          </p>
        </div>

        {/* Form */}
        <InviteLinkForm />
      </div>
    </AuthGuard>
  );
}
