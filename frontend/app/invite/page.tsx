"use client";

import { InviteLinkForm } from "@/components/members/InviteForm";
import { InviteAnimation } from "@/components/ui/InviteAnimation";
import { AuthGuard } from "@/components/providers/AuthGuard";

export default function InvitePage() {
  return (
    <AuthGuard>
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-8">
        {/* Page header */}
        <div className="mb-6 pb-6 border-b border-[#f1f3f4]">
          <h1 className="text-xl font-bold text-[#202124]">Invite Links</h1>
          <p className="text-sm text-[#5f6368] mt-0.5">
            Create shareable invite links for new members and coordinators
          </p>
        </div>

        {/* Two-column: form on the left, looping animation panel on the right (lg+) */}
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)] gap-8 items-start">
          <InviteLinkForm />

          <div className="hidden lg:block sticky top-28 self-start">
            <InviteAnimation />
            <p className="text-center text-xs text-[#80868b] mt-4">
              Grow your club — every invite builds the community.
            </p>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
