import { InviteLinkForm } from "@/components/members/InviteForm";
import Link from "next/link";

export default function InvitePage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-8 sm:pt-12">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Link
            href="/"
            className="w-8 h-8 rounded-lg bg-white/5 border border-white/[0.06] 
                       flex items-center justify-center hover:bg-white/10 transition-colors"
          >
            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div className="w-2 h-8 rounded-full bg-gradient-to-b from-cyan-500 to-blue-600" />
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-100 tracking-tight">
            Invite Links
          </h1>
        </div>
        <p className="text-sm text-gray-500 ml-[4.5rem]">
          Create shareable invite links for new members
        </p>
      </div>

      {/* Form */}
      <InviteLinkForm />
    </div>
  );
}
