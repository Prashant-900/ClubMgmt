"use client";

import type { User } from "@/types";
import { RoleGate } from "@/components/ui/RoleGate";

interface MemberCardProps {
  member: User;
  onRemove?: (id: string) => void;
  index?: number;
}

function getInitials(name: string | null, email: string): string {
  if (name) {
    return name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }
  return email[0].toUpperCase();
}

function getRoleBadgeClasses(role: string): string {
  switch (role) {
    case "ADMIN":
      return "text-role-admin bg-role-admin-bg border border-violet-500/30";
    case "COORDINATOR":
      return "text-role-coordinator bg-role-coordinator-bg border border-cyan-500/30";
    case "MEMBER":
      return "text-role-member bg-role-member-bg border border-emerald-500/30";
    default:
      return "text-gray-400 bg-gray-500/10 border border-gray-500/30";
  }
}

function getAvatarGradient(role: string): string {
  switch (role) {
    case "ADMIN":
      return "from-violet-600 to-purple-800";
    case "COORDINATOR":
      return "from-cyan-500 to-blue-700";
    case "MEMBER":
      return "from-emerald-500 to-teal-700";
    default:
      return "from-gray-500 to-gray-700";
  }
}

export function MemberCard({ member, onRemove, index = 0 }: MemberCardProps) {
  const initials = getInitials(member.name, member.email);

  return (
    <div
      className="group bg-glass backdrop-blur-xl border border-glass-border rounded-2xl p-5 
                 hover:bg-glass-hover hover:border-glass-border-light 
                 transition-all duration-300 ease-out
                 hover:-translate-y-1 hover:shadow-lg hover:shadow-violet-500/5
                 animate-fade-in"
      style={{ animationDelay: `${index * 60}ms`, animationFillMode: "both" }}
    >
      {/* Top row: Avatar + Name + Role */}
      <div className="flex items-start gap-3.5 mb-4">
        {/* Avatar */}
        <div
          className={`w-11 h-11 rounded-full bg-gradient-to-br ${getAvatarGradient(member.role)} 
                      flex items-center justify-center text-white text-sm font-bold shrink-0
                      ring-2 ring-white/5 group-hover:ring-white/10 transition-all`}
        >
          {initials}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-[15px] font-semibold text-gray-100 truncate leading-tight">
            {member.name || "Pending Setup"}
          </h3>
          <p className="text-xs text-gray-500 truncate mt-0.5">{member.email}</p>
        </div>

        {/* Role badge */}
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wider uppercase shrink-0 ${getRoleBadgeClasses(member.role)}`}
        >
          {member.role}
        </span>
      </div>

      {/* Details */}
      <div className="space-y-2.5 text-sm">
        {member.phone && (
          <div className="flex items-center gap-2 text-gray-400">
            <svg className="w-3.5 h-3.5 text-gray-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            <span className="truncate">{member.phone}</span>
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-white/5">
          {/* Verified status */}
          <div className="flex items-center gap-1.5">
            {member.isVerified ? (
              <>
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50" />
                <span className="text-xs text-emerald-400/80">Verified</span>
              </>
            ) : (
              <>
                <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-sm shadow-amber-400/50" />
                <span className="text-xs text-amber-400/80">Pending</span>
              </>
            )}
          </div>

          {/* Join date */}
          <span className="text-[11px] text-gray-600">
            {new Date(member.createdAt).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </span>
        </div>
      </div>

      {/* Admin-only remove button */}
      <RoleGate allowedRoles={["ADMIN"]}>
        {onRemove && (
          <button
            onClick={() => onRemove(member.id)}
            className="mt-3 w-full py-1.5 text-xs font-medium text-red-400/70 
                       bg-red-500/5 border border-red-500/10 rounded-lg
                       hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20
                       transition-all duration-200 cursor-pointer opacity-0 group-hover:opacity-100"
          >
            Remove Member
          </button>
        )}
      </RoleGate>
    </div>
  );
}
